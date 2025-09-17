// backend/services/notify.js
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('../realtime/socket');

function userMatch(userId){
  return { $or: [{ userId }, { user: userId }] };
}
function unreadConditionFor(userId){
  return {
    ...userMatch(userId),
    $and: [
      { $or: [{ read: { $ne:true } }, { read: { $exists:false } }] },
      { $or: [{ isRead:{ $ne:true } }, { isRead:{ $exists:false } }] },
      { $or: [{ readAt:{ $exists:false } }, { readAt:null }] },
    ],
  };
}

async function getDisplayName(userId){
  const u = await User.findById(userId).select('name surname email').lean();
  if (!u) return 'Utente';
  const full = [u.name, u.surname].filter(Boolean).join(' ').trim();
  return full || u.email || 'Utente';
}

async function notifyUser(userId, { type, title, body, data }){
  if (!userId) return null;

  const doc = await Notification.create({
    userId,
    user: userId,          
    type: type || 'INFO',
    title: title || '',
    body: body || '',
    data: data || {},
    read: false,
    isRead: false,
  });


  emitToUser(userId, 'notification:new', {
    _id: doc._id,
    type: doc.type,
    title: doc.title,
    body: doc.body,
    createdAt: doc.createdAt,
    data: doc.data || {},
  });

  const count = await Notification.countDocuments(unreadConditionFor(userId));
  emitToUser(userId, 'notifications:unread', { count });

  return doc;
}

module.exports = { notifyUser, getDisplayName };




