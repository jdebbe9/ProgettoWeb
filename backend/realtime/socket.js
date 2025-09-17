// backend/realtime/socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');

let io = null;

function log(...a){ if (process.env.NODE_ENV !== 'production') console.log(...a); }
function warn(...a){ if (process.env.NODE_ENV !== 'production') console.warn(...a); }

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
async function pushUnreadCount(userId){
  try{
    if (!userId || !io) return;
    const count = await Notification.countDocuments(unreadConditionFor(userId));
    emitToUser(userId, 'notifications:unread', { count });
  }catch(e){ warn('[socket] pushUnreadCount failed:', e?.message || e); }
}

function joinRooms(socket, rawId){
  if (!rawId) return;
  const uid = String(rawId);
  socket.join(uid);
  socket.join(`user:${uid}`);
  socket.data.userId = uid;
  log('[socket][server] joined rooms:', uid, `user:${uid}`);
  pushUnreadCount(uid); 
}

function tryJoinFromToken(socket, token){
  try{
    if (!token) return false;
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!payload?.userId) return false;
    joinRooms(socket, payload.userId);
    return true;
  }catch(e){
    warn('[socket] token join failed:', e?.message || e);
    return false;
  }
}

function initSocket(httpServer){
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  io = new Server(httpServer, {
    cors: { origin: FRONTEND_URL, credentials: true },
    path: '/socket.io',
    transports: ['websocket'],
  });

  io.on('connection', (socket) => {
    const t = socket.handshake?.auth?.token || socket.handshake?.query?.token;
    const hsUid = socket.handshake?.auth?.userId || socket.handshake?.query?.userId;
    log('[socket][server] connected:', socket.id, { hasToken: !!t, hsUid: hsUid || null });

    if (!tryJoinFromToken(socket, t) && hsUid) joinRooms(socket, hsUid);

   
    socket.on('auth', ({ token, userId } = {}) => {
      if (!tryJoinFromToken(socket, token) && userId) joinRooms(socket, userId);
    });

   
    socket.on('join', (userId) => joinRooms(socket, userId));

    socket.on('disconnect', (reason) => log('[socket] disconnect', socket.id, reason));
  });

  return io;
}

function getIO(){
  if (!io) throw new Error('socket.io non inizializzato');
  return io;
}
function emitToUser(userId, event, payload){
  if (!io || !userId) return;
  const uid = String(userId);
  getIO().to(uid).to(`user:${uid}`).emit(event, payload);
}

module.exports = { initSocket, getIO, emitToUser, pushUnreadCount };





