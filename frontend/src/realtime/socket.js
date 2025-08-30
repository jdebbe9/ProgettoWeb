// src/realtime/socket.js
import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(userId) {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      withCredentials: true,
      autoConnect: false,
      // 👇 passiamo l'userId già nell'handshake così il server fa join immediato
      auth: userId ? { userId: String(userId) } : undefined,
    });
  } else if (userId) {
    // se già creato, aggiorna i dati di auth da usare alla prossima connect
    socket.auth = { userId: String(userId) };
  }

  if (!socket.connected) socket.connect();

  // doppia rete di sicurezza: join esplicito sulla stanza
  if (userId) socket.emit('join', String(userId));

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() { return socket; }






