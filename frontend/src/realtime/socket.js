// src/realtime/socket.js
import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  if (socket) {
    if (!socket.connected) socket.connect();
  } else {
    socket = io('/', {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: true,
    });

    const auth = () => {
      const token = localStorage.getItem('accessToken');
      if (token) socket.emit('auth', { token });
    };

    socket.on('connect', auth);
    socket.on('reconnect', auth);
  }

  // ogni chiamata garantisce che il token attuale sia inviato
  const token = localStorage.getItem('accessToken');
  if (token) socket.emit('auth', { token });

  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}





