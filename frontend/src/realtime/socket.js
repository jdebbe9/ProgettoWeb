// src/realtime/socket.js
import { io } from 'socket.io-client';

let socket = null;

function resolveSocketUrl() {
  const envUrl = import.meta.env?.VITE_SOCKET_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    const { origin } = window.location;
    if (origin.includes('localhost:5173') || origin.includes('127.0.0.1:5173')) {
      return 'http://localhost:5000';
    }
    return origin;
  }
  return undefined;
}

export function connectSocket(userId) {
  const uid = userId ? String(userId) : null;

  if (!socket) {
    socket = io(resolveSocketUrl(), {
      withCredentials: true,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: uid ? { userId: uid } : undefined,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
    });

    if (import.meta.env?.DEV) {
      socket.on('connect', () => console.log('[socket] connected', socket.id));
      socket.on('connect_error', (e) => console.warn('[socket] connect_error', e?.message || e));
    }

    const fire = (type, detail) => window.dispatchEvent(new CustomEvent(type, { detail }));

    // Bridge eventi appuntamenti
    socket.on('appointment:created', (p) => fire('rt:appointment', { kind: 'created', payload: p }));
    socket.on('appointment:updated', (p) => fire('rt:appointment', { kind: 'updated', payload: p }));
    socket.on('appointment:deleted', (p) => fire('rt:appointment', { kind: 'deleted', payload: p }));
    socket.on('appointment:removed', (p) => fire('rt:appointment', { kind: 'removed', payload: p }));

    // Bridge conteggio notifiche
    socket.on('notifications:unread', (p) => fire('rt:notifications:unread', p));
  }

  if (uid) socket.auth = { userId: uid };

  const doJoin = () => {
    if (!uid) return;
    try { socket.emit('join', uid); }
    catch (err) { if (import.meta.env?.DEV) console.warn('[socket] join failed', err); }
  };

  if (socket.connected) doJoin(); else socket.once('connect', doJoin);
  socket.off('reconnect', doJoin);
  socket.on('reconnect', doJoin);

  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  try { socket.removeAllListeners?.(); socket.disconnect?.(); }
  catch (err) { if (import.meta.env?.DEV) console.warn('[socket] disconnect failed', err); }
  socket = null;
}

export function getSocket() { return socket; }









