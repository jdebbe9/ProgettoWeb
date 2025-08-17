const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

/* ---- helper: recupera id e ruolo, qualunque sia il middleware ---- */
async function getAuth(req) {
  const id =
    (req?.user && (req.user._id || req.user.id)) ||
    req?.userId ||
    req?.auth?.userId ||
    null;

  let role =
    (req?.user && req.user.role) ||
    req?.auth?.role ||
    null;

  if (!role && id && mongoose.isValidObjectId(id)) {
    const u = await User.findById(id).select('role');
    role = u?.role || null;
  }
  return { id, role, isTherapist: role === 'therapist', isPatient: role === 'patient' };
}

/* ---- terapeuta unico risolto lato server (ignora input client) ---- */
async function resolveTherapistId() {
  if (process.env.THERAPIST_EMAIL) {
    const tByEmail = await User.findOne({ email: process.env.THERAPIST_EMAIL, role: 'therapist' }).select('_id');
    if (tByEmail) return tByEmail._id;
  }
  const t = await User.findOne({ role: 'therapist' }).select('_id');
  return t ? t._id : null;
}

/* ------------------------------- LIST ------------------------------- */
exports.list = async (req, res, next) => {
  try {
    const { id: myId, isTherapist } = await getAuth(req);
    if (!myId) return res.status(401).json({ message: 'Non autenticato' });

    const filter = isTherapist ? { therapist: myId } : { patient: myId };

    if (process.env.NODE_ENV !== 'production') {
      console.log('[appointments:list]', { myId: String(myId), isTherapist, filter });
    }

    const items = await Appointment
      .find(filter)
      .sort({ date: 1 })
      .populate('patient', 'name email')
      .populate('therapist', 'name email');

    res.json(items);
  } catch (e) { next(e); }
};

/* ------------------------------ CREATE ------------------------------ */
exports.create = async (req, res, next) => {
  try {
    const { id: patientId, isPatient } = await getAuth(req);
    if (!patientId) return res.status(401).json({ message: 'Non autenticato' });
    if (!isPatient)  return res.status(403).json({ message: 'Solo i pazienti possono prenotare.' });

    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Data obbligatoria' });

    const when = new Date(date);
    if (Number.isNaN(when.getTime()) || when < new Date()) {
      return res.status(400).json({ message: 'Data non valida o nel passato.' });
    }

    // terapeuta deciso dal server
    const therapistId = await resolveTherapistId();
    if (!therapistId) return res.status(500).json({ message: 'Terapeuta non configurato' });

    const doc = await Appointment.create({
      patient: patientId,
      therapist: therapistId,
      date: when,
      status: 'pending',
      createdBy: patientId
    });

    // ❗ Populate tramite query (niente chaining su document)
    const populated = await Appointment.findById(doc._id)
      .populate('therapist', 'name email')
      .populate('patient', 'name email');

    if (process.env.NODE_ENV !== 'production') {
      console.log('[appointments:create]', {
        id: String(doc._id),
        patient: String(patientId),
        therapist: String(therapistId),
        date: when.toISOString()
      });
    }

    res.status(201).json(populated);
  } catch (e) { next(e); }
};

/* ------------------------------ UPDATE ------------------------------ */
exports.update = async (req, res, next) => {
  try {
    const { id: myId, isTherapist } = await getAuth(req);
    if (!myId) return res.status(401).json({ message: 'Non autenticato' });
    if (!isTherapist) return res.status(403).json({ message: 'Solo il terapeuta può modificare.' });

    const { id } = req.params;
    const patch = {};
    if (req.body.status) patch.status = req.body.status;
    if (req.body.date) {
      const d = new Date(req.body.date);
      if (Number.isNaN(d.getTime()) || d < new Date()) {
        return res.status(400).json({ message: 'Data non valida o nel passato.' });
      }
      patch.date = d;
    }

    const appt = await Appointment.findOneAndUpdate(
      { _id: id, therapist: myId },
      { $set: patch },
      { new: true }
    );
    if (!appt) return res.status(404).json({ message: 'Appuntamento non trovato' });
    res.json(appt);
  } catch (e) { next(e); }
};

/* ------------------------------ REMOVE ------------------------------ */
exports.remove = async (req, res, next) => {
  try {
    const { id: myId, isTherapist } = await getAuth(req);
    if (!myId) return res.status(401).json({ message: 'Non autenticato' });

    const { id } = req.params;
    const filter = isTherapist
      ? { _id: id, therapist: myId }
      : { _id: id, patient: myId };

    const deleted = await Appointment.findOneAndDelete(filter);
    if (!deleted) return res.status(404).json({ message: 'Appuntamento non trovato o non autorizzato' });
    res.status(204).send();
  } catch (e) { next(e); }
};





