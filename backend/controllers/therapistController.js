// controllers/therapistController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const QuestionnaireResponse = require('../models/QuestionnaireResponse');
const DiaryEntry = require('../models/DiaryEntry');
const Appointment = require('../models/Appointment');

function escRx(s = '') {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


exports.getAllPatients = async (req, res) => {
  try {
   
    if (req.user?.role !== 'therapist') {
      return res.status(403).json({ message: 'Permesso negato' });
    }

    const page  = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const skip  = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      User.find({ role: 'patient' })
        .select('-passwordHash -refreshTokenHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ role: 'patient' })
    ]);

    res.json({
      items: patients,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Errore lettura pazienti:', err);
    res.status(500).json({ message: 'Errore interno' });
  }
};


exports.searchPatients = async (req, res) => {
  try {
    if (req.user?.role !== 'therapist') {
      return res.status(403).json({ message: 'Permesso negato' });
    }

    const q = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);

    if (q.length < 2) {
      return res.json({ items: [] });
    }

    const rx = new RegExp('^' + escRx(q), 'i');       
    const rxStr = '^' + escRx(q);                      

    const where = {
      role: 'patient',
      $or: [
        { name: rx },
        { surname: rx },
        
        { $expr: { $regexMatch: { input: { $concat: ['$name', ' ', '$surname'] }, regex: rxStr, options: 'i' } } }
      ]
    };

    const items = await User.find(where)
      .select('_id name surname') 
      .sort({ name: 1, surname: 1 })
      .limit(limit)
      .lean();

    res.json({ items });
  } catch (err) {
    console.error('Errore ricerca pazienti:', err);
    res.status(500).json({ message: 'Errore interno' });
  }
};


exports.getPatientDetails = async (req, res) => {
  try {
    if (req.user?.role !== 'therapist') {
      return res.status(403).json({ message: 'Permesso negato' });
    }

    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'ID paziente non valido' });
    }

    const user = await User.findById(userId).select('-passwordHash -refreshTokenHash');
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ message: 'Paziente non trovato' });
    }

    const [diary, questionnaire, appointments] = await Promise.all([
   
      DiaryEntry.find({
        user: userId,
        $or: [{ shared: true }, { shared: { $exists: false } }]
      }).sort({ createdAt: -1 }),
      QuestionnaireResponse.findOne({ user: userId }).select('-__v -user'),
      Appointment.find({ patient: userId })
        .sort({ date: 1 })
        .populate([{ path: 'therapist', select: 'email role' }])
    ]);

    res.json({ user, diary, questionnaire, appointments });
  } catch (err) {
    console.error('Errore dettagli paziente:', err);
    res.status(500).json({ message: 'Errore interno' });
  }
};

