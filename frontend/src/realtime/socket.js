// frontend/src/realtime/socket.js
import { io } from 'socket.io-client';
import { getAccessToken } from '../api/axios'; // prende l'access token se presente

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
  const uid = userId ? String(userId) : (window.__USER_ID__ ? String(window.__USER_ID__) : null);
  const token = (typeof getAccessToken === 'function' && getAccessToken()) || localStorage.getItem('accessToken') || null;

  // crea la socket una sola volta
  if (!socket) {
    socket = io(resolveSocketUrl(), {
      withCredentials: true,
      path: '/socket.io',
      transports: ['websocket'],         // ok, tieni solo ws
      autoConnect: true,
      auth: (token || uid) ? { token, userId: uid } : undefined, // passa anche nel primo handshake
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
    });

    // log utili in dev
    if (import.meta.env?.DEV) {
      socket.on('connect',    () => console.log('[socket] connected', socket.id));
      socket.on('connect_error', (e) => console.warn('[socket] connect_error', e?.message || e));
      socket.on('reconnect',  (n) => console.log('[socket] reconnected', n));
    }

    // bridge helper
    const fire = (type, detail) => window.dispatchEvent(new CustomEvent(type, { detail }));

    // ---- eventi che ci servono lato UI
    socket.on('appointment:created', (p) => fire('rt:appointment', { kind: 'created', payload: p }));
    socket.on('appointment:updated', (p) => fire('rt:appointment', { kind: 'updated', payload: p }));
    socket.on('appointment:deleted', (p) => fire('rt:appointment', { kind: 'deleted', payload: p }));
    socket.on('appointment:removed', (p) => fire('rt:appointment', { kind: 'removed', payload: p })); // compat

    // 🔔 conteggio badge
    socket.on('notifications:unread', (p) => fire('rt:notifications:unread', p));
    // opzionale: nuova notifica singola
    socket.on('notification:new', (n) => fire('rt:notification', n));
  }

  // aggiorna i dati di auth per eventuali reconnessioni future
  if (token || uid) socket.auth = { token, userId: uid };

  // funzione che invia auth+join appena connessi (o a ogni reconnect)
  const doAuthJoin = () => {
    try {
      const t = (typeof getAccessToken === 'function' && getAccessToken()) || localStorage.getItem('accessToken') || null;
      if (t) socket.emit('auth', { token: t }); // preferito: token
      const idToJoin = uid || window.__USER_ID__;
      if (idToJoin) socket.emit('join', String(idToJoin)); // compat: userId
    } catch (err) {
      if (import.meta.env?.DEV) console.warn('[socket] auth/join failed', err);
    }
  };

  // esegui subito se già connesso, altrimenti al connect
  if (socket.connected) doAuthJoin();
  else socket.once('connect', doAuthJoin);

  // ripeti su ogni reconnect
  socket.off('reconnect', doAuthJoin);
  socket.on('reconnect', doAuthJoin);

  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  try {
    socket.removeAllListeners?.();
    socket.disconnect?.();
  } catch (err) {
    if (import.meta.env?.DEV) console.warn('[socket] disconnect failed', err);
  }
  socket = null;
}

export function getSocket() {
  return socket;
}








