// controllers/diaryController.js
const mongoose = require('mongoose');
const DiaryEntry = require('../models/DiaryEntry');

// POST /api/diary
exports.createDiaryEntry = async (req, res) => {
  try {
    const raw = (req.body?.content ?? '').toString();
    const content = raw.trim();

    if (!content) {
      return res.status(400).json({ message: 'Il contenuto è obbligatorio' });
    }
    if (content.length > 5000) {
      return res.status(400).json({ message: 'Il contenuto supera i 5000 caratteri' });
    }

    const entry = await DiaryEntry.create({
      user: req.user.id,
      content
    });

    return res.status(201).json(entry);
  } catch (err) {
    console.error('Errore creazione diario:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

// GET /api/diary
// Ritorna le entry dell’utente corrente (ultime per prime).
// Facoltativo: ?page=1&limit=20
exports.getMyDiaryEntries = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      DiaryEntry.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DiaryEntry.countDocuments({ user: req.user.id })
    ]);

    return res.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Errore lettura diario:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

// PATCH /api/diary/:entryId
exports.updateDiaryEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({ message: 'ID entry non valido' });
    }

    const raw = (req.body?.content ?? '').toString();
    const content = raw.trim();
    if (!content) return res.status(400).json({ message: 'Il contenuto è obbligatorio' });
    if (content.length > 5000) {
      return res.status(400).json({ message: 'Il contenuto supera i 5000 caratteri' });
    }

    const entry = await DiaryEntry.findOneAndUpdate(
      { _id: entryId, user: req.user.id }, // ownership check
      { content },
      { new: true }
    );

    if (!entry) return res.status(404).json({ message: 'Entry non trovata' });
    return res.json(entry);
  } catch (err) {
    console.error('Errore aggiornamento diario:', err);
    return res.status(500).json({ message: 'Errore interno' });
  }
};

// DELETE /api/diary/:entryId  (opzionale: esponila nelle route se ti serve)
exports.deleteDiaryEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({ message: 'ID entry non valido' });
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
