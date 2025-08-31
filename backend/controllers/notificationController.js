// backend/controllers/notificationController.js
const Notification = require('../models/Notification');
const { userFilter, unreadClause, pushUnreadCount } = require('../services/notify');

function getUid(req) {
  return (
    req?.user?._id ||
    req?.user?.id ||
    req?.auth?.userId ||
    req?.userId ||
    null
  );
}

// GET /api/notifications?limit=20
exports.list = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ message: 'Non autenticato' });

    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 20;
    if (limit > 100) limit = 100;

    const items = await Notification.find(userFilter(uid))
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    // normalizza flags di lettura (supporta read/readAt/isRead)
    const normalized = (items || []).map((n) => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data || {},
      createdAt: n.createdAt,
      readAt: n.readAt || null,
      read: !!(n.readAt || n.read || n.isRead),
      isRead: !!(n.readAt || n.read || n.isRead),
    }));

    res.json(normalized);
  } catch (e) {
    console.error('[notifications:list] error:', e);
    res.status(500).json({ message: 'Errore interno (notifications:list)' });
  }
};

// GET /api/notifications/unread-count
exports.unreadCount = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ message: 'Non autenticato' });

    const count = await Notification.countDocuments({
      ...userFilter(uid),
      ...unreadClause,
    });
    res.json({ count });
  } catch (e) {
    console.error('[notifications:unread-count] error:', e);
    res.status(500).json({ message: 'Errore interno' });
  }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ message: 'Non autenticato' });

    const { id } = req.params;
    await Notification.updateOne(
      { _id: id, ...userFilter(uid) },
      { $set: { readAt: new Date(), read: true, isRead: true } }
    );

    await pushUnreadCount(uid);
    res.json({ ok: true });
  } catch (e) {
    console.error('[notifications:markRead] error:', e);
    res.status(500).json({ message: 'Errore interno' });
  }
};

// PATCH /api/notifications/mark-all
exports.markAll = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ message: 'Non autenticato' });

    await Notification.updateMany(
      { ...userFilter(uid), ...unreadClause },
      { $set: { readAt: new Date(), read: true, isRead: true } }
    );

    await pushUnreadCount(uid);
    res.json({ ok: true });
  } catch (e) {
    console.error('[notifications:markAll] error:', e);
    res.status(500).json({ message: 'Errore interno' });
  }
};

// DELETE /api/notifications
exports.clearAll = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ message: 'Non autenticato' });

    await Notification.deleteMany(userFilter(uid));
    await pushUnreadCount(uid);
    res.json({ ok: true });
  } catch (e) {
    console.error('[notifications:clearAll] error:', e);
    res.status(500).json({ message: 'Errore interno' });
  }
};







