// backend/services/notify.js
const Notification = require('../models/Notification');
const { emitToUser } = require('../realtime/socket');

const DEV = process.env.NODE_ENV !== 'production';
const dlog = (...a) => DEV && console.log('[notify]', ...a);
const dwarn = (...a) => DEV && console.warn('[notify]', ...a);

// Accetta schemi che usano 'userId' o 'user'
function userFilter(userId) {
  const uid = String(userId);
  return { $or: [{ userId: uid }, { user: uid }] };
}

// "Non letta" = niente readAt e flag read/isRead non true
const unreadClause = {
  $and: [
    { $or: [{ readAt: { $exists: false } }, { readAt: null }] },
    { $or: [{ read: { $exists: false } }, { read: { $ne: true } }] },
    { $or: [{ isRead: { $exists: false } }, { isRead: { $ne: true } }] },
  ],
};

// Conta e invia il badge
async function pushUnreadCount(userId) {
  if (!userId) return;
  const count = await Notification.countDocuments({ ...userFilter(userId), ...unreadClause });
  emitToUser(userId, 'notifications:unread', { count });
  dlog('emit notifications:unread →', String(userId), count);
}

// Normalizza payload "new" verso il client
function sanitizeNotif(doc) {
  if (!doc) return null;
  return {
    _id: doc._id,
    type: doc.type,
    title: doc.title,
    body: doc.body,
    data: doc.data || {},
    createdAt: doc.createdAt,
    read: !!(doc.readAt || doc.read || doc.isRead),
    isRead: !!(doc.readAt || doc.read || doc.isRead),
  };
}

/** Crea una notifica + emette:
 *  - notification:new (per la lista)
 *  - notifications:unread {count} (per il badge)
 */
async function notifyUser(userId, payload = {}) {
  if (!userId) throw new Error('notifyUser: userId richiesto');

  const base = {
    type: String(payload.type || 'INFO').toUpperCase(),
    title: payload.title || '',
    body: payload.body || '',
    data: payload.data || {},
  };

  // Tenta userId + user (compat)
  let doc = null;
  try {
    doc = await Notification.create({ ...base, userId: userId, user: userId });
  } catch (e1) {
    dwarn('create with userId+user failed:', e1?.message || e1);
    // fallback: prova con il solo campo 'user'
    doc = await Notification.create({ ...base, user: userId });
  }

  try {
    emitToUser(userId, 'notification:new', sanitizeNotif(doc));
    dlog('emit notification:new →', String(userId));
  } catch (e) {
    dwarn('emit notification:new failed:', e?.message || e);
  }

  await pushUnreadCount(userId);
  return doc;
}

/** Segna UNA notifica come letta + aggiorna badge */
async function markOneRead(userId, id) {
  await Notification.updateOne(
    { _id: id, ...userFilter(userId) },
    { $set: { readAt: new Date(), read: true, isRead: true } }
  );
  await pushUnreadCount(userId);
}

/** Segna TUTTE come lette + aggiorna badge */
async function markAllRead(userId) {
  await Notification.updateMany(
    { ...userFilter(userId), ...unreadClause },
    { $set: { readAt: new Date(), read: true, isRead: true } }
  );
  await pushUnreadCount(userId);
}

/** Svuota tutto + aggiorna badge */
async function clearAll(userId) {
  await Notification.deleteMany(userFilter(userId));
  await pushUnreadCount(userId);
}

module.exports = {
  notifyUser,
  pushUnreadCount,
  markOneRead,
  markAllRead,
  clearAll,
  userFilter,      // esportati se servono altrove
  unreadClause,
};



