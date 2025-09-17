// backend/controllers/diaryController.js
const mongoose = require('mongoose');
const DiaryEntry = require('../models/DiaryEntry');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const ALLOWED_EMOTIONS = DiaryEntry.ALLOWED_EMOTIONS || [
  'gioia','tristezza','rabbia','ansia','paura','calma','sorpresa','disgusto',
  'amore','gratitudine','frustrazione','solitudine','speranza','colpa',
  'vergogna','orgoglio','eccitazione','sollievo','noia','confusione'
];

function normalizeContent(value) {
  return ((value ?? '') + '').trim();
}
function coerceMood(value, def = 3) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 5) return def;
  return n;
}
function normalizeEmotions(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((e) => (e ?? '').toString().trim().toLowerCase())
    .filter(Boolean)
    .filter((e) => ALLOWED_EMOTIONS.includes(e));
}


exports.createDiaryEntry = async (req, res) => {
  try {
    const { content: bodyContent, mood, emotions, shared } = req.body || {};

  
    const content = normalizeContent(bodyContent);
    if (content.length > 5000) {
      return res.status(400).json({ message: 'Il contenuto supera i 5000 caratteri' });
    }

    const entry = await DiaryEntry.create({
      user: req.user.id,
      content,
      mood: coerceMood(mood, 3),
      emotions: normalizeEmotions(emotions),
      shared: typeof shared === 'boolean' ? shared : true
    });

    return res.status(201).json(entry);
  } catch (err) {
    console.error('Errore creazione diario:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Errore interno' });
  }
};


exports.getMyDiaryEntries = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit ?? '20', 10) || 20));

    const filter = { user: req.user.id };


    if (req.query.mood) {
      const m = coerceMood(req.query.mood, NaN);
      if (Number.isFinite(m)) filter.mood = m;
    }
    if (req.query.hasEmotions === 'true') {
      filter.emotions = { $exists: true, $ne: [] };
    }
    const createdAt = {};
    if (req.query.from) {
      const d = new Date(req.query.from);
      if (!isNaN(d)) createdAt.$gte = d;
    }
    if (req.query.to) {
      const d = new Date(req.query.to);
      if (!isNaN(d)) createdAt.$lte = d;
    }
    if (Object.keys(createdAt).length) filter.createdAt = createdAt;

    const [items, total] = await Promise.all([
      DiaryEntry.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DiaryEntry.countDocuments(filter)
    ]);

    return res.json({
      page,
      limit,
      total,
      items
    });
  } catch (err) {
    console.error('Errore lettura diario:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};


exports.updateDiaryEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    if (!isValidObjectId(entryId)) {
      return res.status(400).json({ message: 'ID non valido' });
    }

    const patch = {};
    if ('content' in req.body) {
      const content = normalizeContent(req.body.content);
      if (content.length > 5000) {
        return res.status(400).json({ message: 'Il contenuto supera i 5000 caratteri' });
      }
      patch.content = content;
    }
    if ('mood' in req.body) {
      const m = coerceMood(req.body.mood, NaN);
      if (!Number.isFinite(m)) {
        return res.status(400).json({ message: 'Mood non valido (1..5)' });
      }
      patch.mood = m;
    }
    if ('emotions' in req.body) {
      patch.emotions = normalizeEmotions(req.body.emotions);
    }
    if ('shared' in req.body) {
      patch.shared = !!req.body.shared;
    }

    const updated = await DiaryEntry.findOneAndUpdate(
      { _id: entryId, user: req.user.id },
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Entry non trovata' });
    }
    return res.json(updated);
  } catch (err) {
    console.error('Errore aggiornamento diario:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Errore interno' });
  }
};


exports.deleteDiaryEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    if (!isValidObjectId(entryId)) {
      return res.status(400).json({ message: 'ID non valido' });
    }

    const deleted = await DiaryEntry.findOneAndDelete({
      _id: entryId,
      user: req.user.id
    });

    if (!deleted) return res.status(404).json({ message: 'Entry non trovata' });
    return res.status(204).send();
  } catch (err) {
    console.error('Errore cancellazione diario:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};