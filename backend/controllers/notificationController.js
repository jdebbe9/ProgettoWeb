// backend/controllers/notificationController.js
const mongoose = require('mongoose');
const Notification = require('../models/Notification');

// GET /api/notifications?limit=20&cursor=<ObjectId>
// Ritorna in ordine decrescente, paginazione con cursor = _id ultimo elemento della pagina precedente
exports.list = async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const cursor = req.query.cursor;
  const { emitToUser } = require('../realtime/socket');



  const q = { userId };
  if (cursor && mongoose.isValidObjectId(cursor)) {
    q._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const items = await Notification.find(q).sort({ _id: -1 }).limit(limit).lean();
  const nextCursor = items.length === limit ? String(items[items.length - 1]._id) : null;

  res.json({ items, nextCursor });
};

// GET /api/notifications/unread-count
exports.unreadCount = async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user.id, readAt: null });
  res.json({ count });
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID non valido' });

  const doc = await Notification.findOneAndUpdate(
    { _id: id, userId: req.user.id, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true }
  ).lean();

  if (!doc) return res.status(404).json({ message: 'Notifica non trovata' });
  res.json(doc);
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.id, readAt: null },
    { $set: { readAt: new Date() } }
  );
  res.json({ ok: true });
};
exports.deleteAll = async (req, res) => {
  await Notification.deleteMany({ userId: req.user.id });
  res.json({ ok: true });
};

// Helper riusabile (Step 2): crea e restituisce la notifica
// Usage: await createFor({ userId, type, title, body, data })
exports.createFor = async ({ userId, type, title, body = '', data = {} }) => {
  const doc = await Notification.create({ userId, type, title, body, data });
  try {
    emitToUser(userId, 'notification:new', doc.toObject ? doc.toObject() : doc);
  } catch (e) {
    // in dev va bene loggare, ma non bloccare la richiesta
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[notifications] emit failed:', e && e.message);
    }
  }
  return doc;
};

