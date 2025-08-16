// controllers/appointmentController.js
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');

// POST /api/appointments
// Crea una richiesta di appuntamento: il paziente è l'utente loggato
exports.bookAppointment = async (req, res) => {
  try {
    const { therapistId, date, notes } = req.body;

    // Validazioni base
    if (!therapistId || !date) {
      return res.status(400).json({ message: 'therapistId e date sono obbligatori' });
    }
    if (!mongoose.Types.ObjectId.isValid(therapistId)) {
      return res.status(400).json({ message: 'therapistId non valido' });
    }
    const when = new Date(date);
    if (Number.isNaN(when.getTime()) || when < new Date()) {
      return res.status(400).json({ message: 'La data deve essere valida' });
    }

    const appointment = await Appointment.create({
      patient: req.user.id,
      therapist: therapistId,
      date: when,
      notes
    });

    // facoltativo: popoliamo per un ritorno più utile
    await appointment.populate([
      { path: 'patient', select: 'email role' },
      { path: 'therapist', select: 'email role' }
    ]);

    return res.status(201).json(appointment);
  } catch (err) {
    console.error('Errore prenotazione:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

// GET /api/appointments
// Lista degli appuntamenti dell'utente corrente (paziente o terapeuta)
exports.getMyAppointments = async (req, res) => {
  try {
    const roleField = req.user.role === 'therapist' ? 'therapist' : 'patient';
    const query = { [roleField]: req.user.id };

    const appointments = await Appointment.find(query)
      .sort({ date: 1 })
      .populate([
        { path: 'patient', select: 'email role' },
        { path: 'therapist', select: 'email role' }
      ]);

    return res.json(appointments);
  } catch (err) {
    console.error('Errore lettura appuntamenti:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

// PATCH /api/appointments/:id
// Aggiorna lo stato/annotazioni di un appuntamento con regole di permesso
exports.updateAppointment = async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID appuntamento non valido' });
    }

    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appuntamento non trovato' });

    const isTherapistOwner = req.user.role === 'therapist' && appt.therapist.toString() === req.user.id;
    const isPatientOwner   = req.user.role !== 'therapist' && appt.patient.toString() === req.user.id;

    // permessi:
    // - terapeuta owner: può confermare/cancellare e modificare notes
    // - paziente owner: può solo cancellare
    if (isTherapistOwner) {
      const allowed = ['pending', 'confirmed', 'cancelled'];
      if (status && !allowed.includes(status)) {
        return res.status(400).json({ message: 'status non valido' });
      }
      if (status) appt.status = status;
      if (typeof notes === 'string') appt.notes = notes;
    } else if (isPatientOwner) {
      if (status && status !== 'cancelled') {
        return res.status(403).json({ message: 'Il paziente può solo cancellare' });
      }
      appt.status = 'cancelled';
      if (typeof notes === 'string') appt.notes = notes;
    } else {
      return res.status(403).json({ message: 'Non hai i permessi per modificare questo appuntamento' });
    }

    await appt.save();
    await appt.populate([
      { path: 'patient', select: 'email role' },
      { path: 'therapist', select: 'email role' }
    ]);

    return res.json(appt);
  } catch (err) {
    console.error('Errore aggiornamento:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

