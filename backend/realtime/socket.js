// backend/realtime/socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    },
    path: '/socket.io', // deve combaciare col client/proxy
  });

  io.on('connection', (socket) => {
    // Join room "user:<id>" dopo verifica token
    const joinFromToken = (token) => {
      try {
        if (!token) return;
        const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const room = `user:${payload.userId}`;
        socket.join(room);
        socket.data.userId = payload.userId;
      } catch {
        // token non valido: ignora
      }
    };

    // 1) token via handshake (facoltativo)
    const tHandshake = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (tHandshake) joinFromToken(tHandshake);

    // 2) token via evento esplicito (consigliato)
    socket.on('auth', ({ token }) => joinFromToken(token));
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('socket.io non inizializzato');
  return io;
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  getIO().to(`user:${userId}`).emit(event, payload);
}

module.exports = { initSocket, getIO, emitToUser };



