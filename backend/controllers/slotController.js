const User = require('../models/User');
const Appointment = require('../models/Appointment');

async function resolveTherapistId() {
  if (process.env.THERAPIST_ID) return process.env.THERAPIST_ID;
  if (process.env.THERAPIST_EMAIL) {
    const t = await User.findOne({ email: process.env.THERAPIST_EMAIL, role: 'therapist' }).select('_id');
    if (t?._id) return t._id;
  }
  const any = await User.findOne({ role: 'therapist' }).select('_id');
  return any ? any._id : null;
}

function generateSlotsForDay(dateStr) {
  const [Y, M, D] = dateStr.split('-').map((x) => parseInt(x, 10));
  const day = new Date(Y, (M - 1), D, 0, 0, 0, 0);
  const dow = day.getDay(); // 0=dom, 6=sab
  if (dow === 0 || dow === 6) return [];
  const mk = (h, m=0) => new Date(Y, (M - 1), D, h, m, 0, 0);
  const hours = [8,9,10,11,12, 15,16,17,18,19];
  return hours.map(h => ({ start: mk(h,0), end: mk(h+1,0) }));
}

exports.availability = async (req, res) => {
  const dateStr = String(req.query.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).json({ message: 'Parametro "date" (YYYY-MM-DD) obbligatorio' });
  }
  const excludeId = String(req.query.exclude || '').trim() || null;

  const therapistId = await resolveTherapistId();
  if (!therapistId) return res.status(500).json({ message: 'Terapeuta non configurato' });

  const slots = generateSlotsForDay(dateStr);
  if (slots.length === 0) return res.json({ date: dateStr, slots: [] });

  const dayStart = new Date(slots[0].start);
  const dayEnd = new Date(slots[slots.length - 1].end);

  const blockingStatuses = ['pending', 'accepted', 'rescheduled'];
  const q = {
    therapist: therapistId,
    status: { $in: blockingStatuses },
    date: { $gte: dayStart, $lt: dayEnd }
  };
  if (excludeId) q._id = { $ne: excludeId };

  const appts = await Appointment.find(q).select('_id date status patient').lean();

  const busyIndex = new Map();
  for (const a of appts) {
    const d = new Date(a.date);
    busyIndex.set(`${d.getHours()}`, a);
  }

  const now = Date.now();
  const out = slots.map(s => {
    const h = s.start.getHours();
    const key = `${h}`;
    const busyAppt = busyIndex.get(key);
    const isPast = s.end.getTime() <= now;
    return {
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      busy: Boolean(busyAppt),
      isPast,
      appointmentId: busyAppt?._id || null,
      status: busyAppt?.status || null
    };
  });

  return res.json({ date: dateStr, slots: out });
};

