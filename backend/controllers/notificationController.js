// backend/controllers/notificationController.js
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('../realtime/socket');

function log(...a) { if (process.env.NODE_ENV !== 'production') console.log(...a); }
function warn(...a) { if (process.env.NODE_ENV !== 'production') console.warn(...a); }

/** Estrae id/ruolo in modo robusto da qualunque middleware tu stia usando */
async function getAuth(req) {
  let id =
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
  return { id, role };
}

/** Match sia schema con userId che schema legacy con user */
function userMatch(userId) {
  return { $or: [{ userId: userId }, { user: userId }] };
}

/** Condizione “unread” robusta (copre read/isRead/readAt assenti) */
function unreadConditionFor(userId) {
  return {
    ...userMatch(userId),
    $and: [
      { $or: [{ read: { $ne: true } }, { read: { $exists: false } }] },
      { $or: [{ isRead: { $ne: true } }, { isRead: { $exists: false } }] },
      { $or: [{ readAt: { $exists: false } }, { readAt: null }] },
    ],
  };
}

/** Calcola e invia via socket il nuovo conteggio */
async function emitUnread(userId) {
  if (!userId) return;
  try {
    const count = await Notification.countDocuments(unreadConditionFor(userId));
    emitToUser(userId, 'notifications:unread', { count });
  } catch (e) {
    warn('[notifications] emitUnread failed:', e && e.message);
  }
}

/* ----------------------------- LIST ----------------------------- */
// GET /api/notifications?limit=20&skip=0
exports.list = async (req, res, next) => {
  try {
    const { id } = await getAuth(req);
    if (!id) return res.status(401).json({ message: 'Non autenticato' });

    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);

    const items = await Notification
      .find(userMatch(id))
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({ items });
  } catch (e) {
    warn('[notifications:list] error:', e);
    return next(e);
  }
};

/* ----------------------- UNREAD COUNT --------------------------- */
// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const { id } = await getAuth(req);
    if (!id) return res.status(401).json({ message: 'Non autenticato' });

    const count = await Notification.countDocuments(unreadConditionFor(id));
    return res.json({ count });
  } catch (e) {
    return next(e);
  }
};

/* ------------------------- MARK ONE ----------------------------- */
// PATCH /api/notifications/:id/read
exports.markOneRead = async (req, res, next) => {
  try {
    const { id: myId } = await getAuth(req);
    if (!myId) return res.status(401).json({ message: 'Non autenticato' });

    const nid = req.params.id;
    if (!mongoose.isValidObjectId(nid)) {
      return res.status(400).json({ message: 'ID notifica non valido' });
    }

    const filter = { _id: nid, ...userMatch(myId) };
    const update = { $set: { read: true, isRead: true, readAt: new Date() } };

    const r = await Notification.updateOne(filter, update);
    if (r.matchedCount === 0) {
      return res.status(404).json({ message: 'Notifica non trovata' });
    }

    await emitUnread(myId);
    return res.json({ ok: true });
  } catch (e) {
    return next(e);
  }
};

/* ---------------------- MARK ALL READ --------------------------- */
// POST /api/notifications/mark-all-read
exports.markAllRead = async (req, res, next) => {
  try {
    const { id: myId } = await getAuth(req);
    if (!myId) return res.status(401).json({ message: 'Non autenticato' });

    await Notification.updateMany(
      unreadConditionFor(myId),
      { $set: { read: true, isRead: true, readAt: new Date() } }
    );

    await emitUnread(myId);
    return res.json({ ok: true });
  } catch (e) {
    return next(e);
  }
};

/* -------------------------- CLEAR ALL --------------------------- */
// DELETE /api/notifications
exports.clearAll = async (req, res, next) => {
  try {
    const { id: myId } = await getAuth(req);
    if (!myId) return res.status(401).json({ message: 'Non autenticato' });

    await Notification.deleteMany(userMatch(myId));
    await emitUnread(myId);
    return res.status(204).send();
  } catch (e) {
    return next(e);
  }
};
exports.markRead = async (req, res) => {
  const { id } = req.params;
  await Notification.updateOne(
    { _id: id, user: req.user.id },
    { $set: { read: true, readAt: new Date() } }
  );
  res.json({ ok: true });
};







