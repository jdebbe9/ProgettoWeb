// backend/controllers/appointmentsController.js
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { notifyUser, getDisplayName } = require('../services/notify');
const { emitToUser } = require('../realtime/socket');

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
  // 1) Preferisci ID esplicito da .env
  if (process.env.THERAPIST_ID) return process.env.THERAPIST_ID;

  // 2) In alternativa, via email da .env
  if (process.env.THERAPIST_EMAIL) {
    const tByEmail = await User.findOne({ email: process.env.THERAPIST_EMAIL, role: 'therapist' }).select('_id');
    if (tByEmail?._id) return tByEmail._id;
  }

  // 3) Fallback: primo con ruolo therapist
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

    // Populate tramite query
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

    // 🔔 Notifica terapeuta
    try {
      const patientName = await getDisplayName(patientId);
      await notifyUser(therapistId, {
        type: 'APPT_REQUESTED',
        title: 'Nuova richiesta di appuntamento',
        body: `${patientName} ha richiesto ${when.toLocaleString('it-IT')}.`,
        data: { appointmentId: doc._id, date: when, patientId }
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[appointments:create] notify therapist failed:', err && err.message);
      }
    }

    // 🔄 Realtime: fai aggiornare le liste
    emitToUser(therapistId, 'appointment:created', { _id: doc._id });
    emitToUser(patientId,   'appointment:created', { _id: doc._id });

    res.status(201).json(populated);
  } catch (e) { next(e); }
};

/* ------------------------------ UPDATE ------------------------------ */
/* Solo terapeuta: può cambiare status e/o data.
   Invia notifiche al paziente:
   - status → ACCEPTED / REJECTED / CANCELLED
   - data   → RESCHEDULED (con old/new) */
exports.update = async (req, res, next) => {
  try {
    const { id: myId, isTherapist } = await getAuth(req);
    if (!myId) return res.status(401).json({ message: 'Non autenticato' });
    if (!isTherapist) return res.status(403).json({ message: 'Solo il terapeuta può modificare.' });

    const { id } = req.params;

    const patch = {};
    if (req.body.status) {
      patch.status = String(req.body.status).toLowerCase(); // accepted/rejected/cancelled/pending
      const map = { confirmed: 'accepted', decline: 'rejected', declined: 'rejected', canceled: 'cancelled' };
      patch.status = map[patch.status] || patch.status;
    }

    if (req.body.date) {
      const d = new Date(req.body.date);
      const now = new Date();
      if (Number.isNaN(d.getTime()) || d < now) {
        return res.status(400).json({ message: 'Data non valida o nel passato.' });
      }
      patch.date = d;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'Nessuna modifica richiesta.' });
    }

    // Leggi prima per conoscere valori precedenti
    const appt = await Appointment.findOne({ _id: id, therapist: myId });
    if (!appt) return res.status(404).json({ message: 'Appuntamento non trovato' });

    const prevStatus = appt.status;
    const prevDate = appt.date;
    const patientId = appt.patient;

    // Applica patch e salva
    if (patch.status) appt.status = patch.status;
    if (patch.date)   appt.date   = patch.date;
    await appt.save();

    // 🔔 Notifiche al paziente
    try {
      // Cambiamento di stato
      if (patch.status && patch.status !== prevStatus) {
        if (patch.status === 'accepted') {
          await notifyUser(patientId, {
            type: 'APPT_ACCEPTED',
            title: 'Appuntamento confermato',
            body: `Confermato per ${appt.date.toLocaleString('it-IT')}.`,
            data: { appointmentId: appt._id, date: appt.date }
          });
        } else if (patch.status === 'rejected') {
          const whenStr = appt.date ? appt.date.toLocaleString('it-IT') : null;
          await notifyUser(patientId, {
            type: 'APPT_REJECTED',
            title: 'Appuntamento rifiutato',
            body: whenStr ? `Richiesta per ${whenStr} rifiutata.` : 'La tua richiesta è stata rifiutata.',
            data: { appointmentId: appt._id, date: appt.date }
          });
        } else if (patch.status === 'cancelled') {
          await notifyUser(patientId, {
            type: 'APPT_CANCELLED',
            title: 'Appuntamento annullato',
            body: 'Il tuo appuntamento è stato annullato dal terapeuta.',
            data: { appointmentId: appt._id, date: appt.date }
          });
        }
      }

      // Riprogrammazione (cambio data)
      if (patch.date && prevDate && appt.date.getTime() !== prevDate.getTime()) {
        await notifyUser(patientId, {
          type: 'APPT_RESCHEDULED',
          title: 'Appuntamento riprogrammato',
          body: `Nuova data: ${appt.date.toLocaleString('it-IT')}.`,
          data: { appointmentId: appt._id, newDate: appt.date, oldDate: prevDate }
        });
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[appointments:update] notify patient failed:', err && err.message);
      }
    }

    // 🔄 Realtime: fai aggiornare le liste (paziente + terapeuta)
    emitToUser(patientId, 'appointment:updated', { _id: appt._id });
    emitToUser(myId,      'appointment:updated', { _id: appt._id });

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

    // 🔔 Notifiche: chi cancella → avvisa l'altra parte
    try {
      if (isTherapist) {
        // Terapeuta cancella → avvisa paziente
        await notifyUser(deleted.patient, {
          type: 'APPT_CANCELLED',
          title: 'Appuntamento annullato',
          body: 'Il tuo appuntamento è stato annullato dal terapeuta.',
          data: { appointmentId: deleted._id, date: deleted.date }
        });
      } else {
        // Paziente cancella → avvisa il terapeuta specifico dell'appuntamento
        const patientName = await getDisplayName(myId);
        await notifyUser(deleted.therapist, {
          type: 'APPT_CANCELLED',
          title: 'Appuntamento cancellato dal paziente',
          body: `${patientName} ha cancellato l’appuntamento del ${new Date(deleted.date).toLocaleString('it-IT')}.`,
          data: { appointmentId: deleted._id, date: deleted.date, patientId: myId }
        });
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[appointments:remove] notify failed:', err && err.message);
      }
    }

    // 🔄 Realtime: rimuovi dalle liste di entrambe le parti
    emitToUser(deleted.patient,   'appointment:deleted', { _id: deleted._id });
    emitToUser(deleted.therapist, 'appointment:deleted', { _id: deleted._id });

    res.status(204).send();
  } catch (e) { next(e); }
};










