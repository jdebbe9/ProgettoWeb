// src/realtime/socket.js
import { io } from 'socket.io-client';

let socket = null;

function resolveSocketUrl() {
  // 1) usa sempre l'ENV se presente
  const envUrl = import.meta.env?.VITE_SOCKET_URL;
  if (envUrl) return envUrl;

  // 2) fallback: prendi l'origin da VITE_API_BASE_URL (es. https://backend.onrender.com/api -> https://backend.onrender.com)
  const apiBase = import.meta.env?.VITE_API_BASE_URL;
  if (apiBase) {
    try {
      // new URL consente anche path relativi (se uno dimentica l'http)
      const u = new URL(apiBase, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      return u.origin;
    } catch {/* */}
  }

  // 3) dev locale
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
  }

  // 4) nessun fallback al dominio Vercel per evitare errori in prod
  return undefined;
}

export function connectSocket(userId) {
  const uid = userId ? String(userId) : null;

  if (!socket) {
    socket = io(resolveSocketUrl(), {
      withCredentials: true,
      path: '/socket.io',
      transports: ['websocket'], // preferisci solo websocket in prod
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

    socket.on('appointment:created', (p) => fire('rt:appointment', { kind: 'created', payload: p }));
    socket.on('appointment:updated', (p) => fire('rt:appointment', { kind: 'updated', payload: p }));
    socket.on('appointment:deleted', (p) => fire('rt:appointment', { kind: 'deleted', payload: p }));
    socket.on('appointment:removed', (p) => fire('rt:appointment', { kind: 'removed', payload: p }));
    socket.on('notifications:unread', (p) => fire('rt:notifications:unread', p));
  }

  if (uid) socket.auth = { userId: uid };

  const doJoin = () => { if (uid) try { socket.emit('join', uid); } catch {/* */} };
  if (socket.connected) doJoin(); else socket.once('connect', doJoin);
  socket.off('reconnect', doJoin);
  socket.on('reconnect', doJoin);

  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  try { socket.removeAllListeners?.(); socket.disconnect?.(); } catch {/* */}
  socket = null;
}

export function getSocket() { return socket; }










