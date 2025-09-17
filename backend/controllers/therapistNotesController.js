const TherapistNote = require('../models/TherapistNote');
const User = require('../models/User');

/** GET /api/therapist/notes/:patientId */
exports.get = async (req, res) => {
  const therapistId = req.user.id;
  const { patientId } = req.params;

  // opzionale: verifica che il paziente esista e sia "patient"
  const patient = await User.findById(patientId).select('_id role').lean();
  if (!patient || patient.role !== 'patient') {
    return res.status(404).json({ message: 'Paziente non trovato.' });
  }

  const note = await TherapistNote.findOne({ therapistId, patientId }).lean();
  res.json({
    text: note?.text || '',
    updatedAt: note?.updatedAt || null,
  });
};

/** PUT /api/therapist/notes/:patientId  { text } */
exports.save = async (req, res) => {
  const therapistId = req.user.id;
  const { patientId } = req.params;
  const { text = '' } = req.body || {};

  const patient = await User.findById(patientId).select('_id role').lean();
  if (!patient || patient.role !== 'patient') {
    return res.status(404).json({ message: 'Paziente non trovato.' });
  }

  const note = await TherapistNote.findOneAndUpdate(
    { therapistId, patientId },
    { $set: { text } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  res.json({
    text: note.text || '',
    updatedAt: note.updatedAt || null,
  });
};
