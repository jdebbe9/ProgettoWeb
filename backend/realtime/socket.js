const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { pushUnreadCount } = require('../services/notify'); // ⬅️ IMPORTANTE

let io = null;

function safeLog(...args) { if (process.env.NODE_ENV !== 'production') console.log('[socket][server]', ...args); }
function safeWarn(...args) { if (process.env.NODE_ENV !== 'production') console.warn('[socket][server]', ...args); }

function initSocket(httpServer) {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  io = new Server(httpServer, {
    cors: {
      origin: FRONTEND_URL,
      credentials: true,
      methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    const hasAuthToken = !!(socket.handshake?.auth?.token || socket.handshake?.query?.token);
    const hsUserId = socket.handshake?.auth?.userId || socket.handshake?.query?.userId || null;
    safeLog('connected:', socket.id, { hasAuthToken, hsUserId: hsUserId || null });

    // entra nelle room e manda SUBITO il conteggio notifiche
    const joinRooms = async (userId) => {
      if (!userId) return;
      const uid = String(userId);
      socket.join(uid);              // compat
      socket.join(`user:${uid}`);    // room nuova
      socket.data.userId = uid;
      safeLog('joined rooms:', uid, `user:${uid}`);
      // 🔔 appena join → invia badge attuale
      try { await pushUnreadCount(uid); } catch (e) { safeWarn('pushUnreadCount on join failed:', e?.message || e); }
    };

    const joinFromToken = async (token) => {
      try {
        if (!token) return false;
        const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if (!payload?.userId) return false;
        await joinRooms(payload.userId);
        return true;
      } catch (err) {
        safeWarn('joinFromToken failed:', err?.message || err);
        return false;
      }
    };

    // 1) handshake
    const tHandshake = socket.handshake?.auth?.token || socket.handshake?.query?.token || null;
    const uidHandshake = socket.handshake?.auth?.userId || socket.handshake?.query?.userId || null;
    (async () => {
      if (tHandshake) { await joinFromToken(tHandshake); }
      else if (uidHandshake) { await joinRooms(uidHandshake); }
    })();

    // 2) evento esplicito { token | userId }
    socket.on('auth', async ({ token, userId } = {}) => {
      safeLog('auth event received. token?', !!token, 'userId?', !!userId);
      if (token) {
        const ok = await joinFromToken(token);
        if (!ok && userId) await joinRooms(userId);
      } else if (userId) {
        await joinRooms(userId);
      }
    });

    // 3) compat: 'join' con userId
    socket.on('join', async (userId) => {
      safeLog('join event:', userId);
      await joinRooms(userId);
    });

    socket.on('disconnect', (reason) => {
      safeLog('disconnect:', socket.id, reason);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('socket.io non inizializzato');
  return io;
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  const uid = String(userId);
  getIO().to(`user:${uid}`).to(uid).emit(event, payload);
  safeLog('emitToUser:', uid, event);
}

module.exports = { initSocket, getIO, emitToUser };




