// backend/controllers/appointmentsController.js
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { notifyUser, getDisplayName } = require('../services/notify');
const { emitToUser } = require('../realtime/socket');


function startOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0); }
function endOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999); }


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


async function resolveTherapistId() {
  if (process.env.THERAPIST_ID) return process.env.THERAPIST_ID;
  if (process.env.THERAPIST_EMAIL) {
    const tByEmail = await User.findOne({ email: process.env.THERAPIST_EMAIL, role: 'therapist' }).select('_id');
    if (tByEmail?._id) return tByEmail._id;
  }
  const t = await User.findOne({ role: 'therapist' }).select('_id');
  return t ? t._id : null;
}


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
      .populate('patient', 'name surname email')
      .populate('therapist', 'name surname email');

    res.json(items);
  } catch (e) { next(e); }
};


exports.create = async (req, res, next) => {
  try {
    const { id: patientId, isPatient } = await getAuth(req);
    if (!patientId) return res.status(401).json({ message: 'Non autenticato' });
    if (!isPatient)  return res.status(403).json({ message: 'Solo i pazienti possono prenotare.' });

    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Data obbligatoria' });

    const when = new Date(date);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ message: 'Data non valida.' });
    }

   
    const now = new Date();
    const tomorrow0 = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    if (when < tomorrow0) {
      return res.status(400).json({ message: 'Serve almeno 1 giorno di preavviso per prenotare.' });
    }

   
    const therapistId = await resolveTherapistId();
    if (!therapistId) return res.status(500).json({ message: 'Terapeuta non configurato' });

   
    const sod = startOfDay(when), eod = endOfDay(when);
    const already = await Appointment.findOne({
      patient: patientId,
      date: { $gte: sod, $lte: eod },
      status: { $in: ['pending', 'accepted'] },
    }).select('_id');
    if (already) {
      return res.status(400).json({ message: 'Hai già una prenotazione per questo giorno.' });
    }

    
    const sameSlot = await Appointment.findOne({
      therapist: therapistId,
      date: when,
      status: { $nin: ['rejected', 'cancelled'] },
    }).select('_id');
    if (sameSlot) {
      return res.status(409).json({ message: 'Questo slot non è più disponibile.' });
    }

    const requestedOnline = !!req.body?.requestedOnline;

    const doc = await Appointment.create({
      patient: patientId,
      therapist: therapistId,
      date: when,
      status: 'pending',
      requestedOnline,
      isOnline: false,
      videoLink: '',
      createdBy: patientId
    });

   
    const populated = await Appointment.findById(doc._id)
      .populate('therapist', 'name email')
      .populate('patient', 'name email');

    if (process.env.NODE_ENV !== 'production') {
      console.log('[appointments:create]', {
        id: String(doc._id),
        patient: String(patientId),
        therapist: String(therapistId),
        date: when.toISOString(),
        requestedOnline
      });
    }

    
    try {
      const patientName = await getDisplayName(patientId); 
      await notifyUser(therapistId, {
        type: 'APPT_REQUESTED',
        title: 'Nuova richiesta di appuntamento',
        body: `${patientName} ha richiesto ${when.toLocaleString('it-IT')}${requestedOnline ? ' (preferenza: online)' : ''}.`,
        data: { appointmentId: doc._id, date: when, patientId }
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[appointments:create] notify therapist failed:', err && err.message);
      }
    }

    
    emitToUser(therapistId, 'appointment:created', { _id: doc._id });
    emitToUser(patientId,   'appointment:created', { _id: doc._id });

    res.status(201).json(populated);
  } catch (e) { next(e); }
};


exports.update = async (req, res, next) => {
  try {
    const { id: myId, isTherapist } = await getAuth(req);
    if (!myId) return res.status(401).json({ message: 'Non autenticato' });
    if (!isTherapist) return res.status(403).json({ message: 'Solo il terapeuta può modificare.' });

    const { id } = req.params;

    const patch = {};
    const allowedStatus = ['pending','accepted','rejected','cancelled','rescheduled'];

    if (req.body.status) {
      const s = String(req.body.status).toLowerCase();
      const map = { confirmed: 'accepted', decline: 'rejected', declined: 'rejected', canceled: 'cancelled' };
      const norm = map[s] || s;
      if (!allowedStatus.includes(norm)) {
        return res.status(400).json({ message: 'Stato non valido.' });
      }
      patch.status = norm;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'date')) {
      const d = new Date(req.body.date);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ message: 'Data non valida.' });
      }
      patch.date = d;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'isOnline')) {
      patch.isOnline = !!req.body.isOnline;
      if (!patch.isOnline) patch.videoLink = ''; 
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'videoLink')) {
      const link = String(req.body.videoLink || '').trim();
      if (link && !/^https?:\/\//i.test(link)) {
        return res.status(400).json({ message: 'videoLink deve essere un URL valido (http/https).' });
      }
      patch.videoLink = link;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'Nessuna modifica richiesta.' });
    }

    
    const appt = await Appointment.findOne({ _id: id, therapist: myId });
    if (!appt) return res.status(404).json({ message: 'Appuntamento non trovato' });

    const prevStatus = appt.status;
    const prevDate = appt.date;
    const patientId = appt.patient;

    
    if (patch.date && (!prevDate || patch.date.getTime() !== prevDate.getTime())) {
      const conflict = await Appointment.findOne({
        _id: { $ne: appt._id },
        therapist: myId,
        date: patch.date,
        status: { $nin: ['rejected', 'cancelled'] },
      }).select('_id');
      if (conflict) {
        return res.status(409).json({ message: 'Lo slot scelto non è disponibile.' });
      }
    }

    
    if (patch.isOnline && !(patch.videoLink || appt.videoLink)) {
      return res.status(400).json({ message: 'Per una visita online è necessario fornire un link.' });
    }

  
    if (patch.status) appt.status = patch.status;
    if (patch.date)   appt.date   = patch.date;
    if (Object.prototype.hasOwnProperty.call(patch, 'isOnline')) appt.isOnline = patch.isOnline;
    if (Object.prototype.hasOwnProperty.call(patch, 'videoLink')) appt.videoLink = patch.videoLink;

    await appt.save();

    
    try {
      
      if (patch.status && patch.status !== prevStatus) {
        if (patch.status === 'accepted') {
          await notifyUser(patientId, {
            type: 'APPT_ACCEPTED',
            title: 'Appuntamento confermato',
            body: `Confermato per ${appt.date.toLocaleString('it-IT')}${appt.isOnline && appt.videoLink ? ' (online)' : ''}.`,
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
        } else if (patch.status === 'rescheduled' && patch.date) {
          await notifyUser(patientId, {
            type: 'APPT_RESCHEDULED',
            title: 'Appuntamento riprogrammato',
            body: `Nuova data: ${appt.date.toLocaleString('it-IT')}.`,
            data: { appointmentId: appt._id, newDate: appt.date, oldDate: prevDate }
          });
        }
      } else if (patch.date && prevDate && appt.date.getTime() !== prevDate.getTime()) {
        
        await notifyUser(patientId, {
          type: 'APPT_RESCHEDULED',
          title: 'Appuntamento riprogrammato',
          body: `Nuova data: ${appt.date.toLocaleString('it-IT')}.`,
          data: { appointmentId: appt._id, newDate: appt.date, oldDate: prevDate }
        });
      }

      
      if ((Object.prototype.hasOwnProperty.call(patch, 'isOnline') || Object.prototype.hasOwnProperty.call(patch, 'videoLink')) && appt.isOnline && appt.videoLink) {
        await notifyUser(patientId, {
          type: 'APPT_ONLINE_LINK',
          title: 'Dettagli visita online',
          body: `Link: ${appt.videoLink}`,
          data: { appointmentId: appt._id, date: appt.date, videoLink: appt.videoLink }
        });
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[appointments:update] notify patient failed:', err && err.message);
      }
    }

    
    emitToUser(patientId, 'appointment:updated', { _id: appt._id });
    emitToUser(myId,      'appointment:updated', { _id: appt._id });

    res.json(appt);
  } catch (e) { next(e); }
};


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

    
    try {
      if (isTherapist) {
        await notifyUser(deleted.patient, {
          type: 'APPT_CANCELLED',
          title: 'Appuntamento annullato',
          body: 'Il tuo appuntamento è stato annullato dal terapeuta.',
          data: { appointmentId: deleted._id, date: deleted.date }
        });
      } else {
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

  
    emitToUser(deleted.patient,   'appointment:deleted', { _id: deleted._id });
    emitToUser(deleted.therapist, 'appointment:deleted', { _id: deleted._id });

    res.status(204).send();
  } catch (e) { next(e); }
};










