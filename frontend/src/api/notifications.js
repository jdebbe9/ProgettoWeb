// frontend/src/api/notifications.js
import api from './axios';

/** Normalizza la risposta in { items, nextCursor } */
function normalizeListResponse(data) {
  if (Array.isArray(data)) return { items: data, nextCursor: null };
  if (Array.isArray(data?.items)) return { items: data.items, nextCursor: data.nextCursor ?? null };
  return { items: [], nextCursor: null };
}

/** Lista notifiche (cursor pagination eventuale) */
export async function listNotifications(params = {}) {
  const { data } = await api.get('/notifications', { params });
  return normalizeListResponse(data);
}

/** Conteggio non letti */
export async function getUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return typeof data === 'number' ? data : (data?.count ?? 0);
}

/** Segna come letta una notifica */
export async function markAsRead(id) {
  if (!id) throw new Error('id notifica mancante');
  await api.patch(`/notifications/${id}/read`);
}
// Alias retro-compatibile
export const markRead = markAsRead;

/**
 * Segna tutte come lette.
 * - prova vari endpoint comuni;
 * - se non presenti, fallback marcando singolarmente le visibili.
 */
export async function markAllRead() {
  const attempts = [
    () => api.patch('/notifications/read-all'),
    () => api.post('/notifications/read-all'),
    () => api.patch('/notifications/mark-all-read'),
    () => api.patch('/notifications/readall'),
  ];

  for (const tryCall of attempts) {
    try {
      await tryCall();
      return;
    } catch {
      // tenta il prossimo endpoint
    }
  }

  // Fallback: marca una-per-una quelle correnti (viste nella lista)
  const res = await listNotifications({ limit: 200 });
  const items = Array.isArray(res?.items) ? res.items : [];
  await Promise.allSettled(
    items
      .filter(n => !n?.readAt && !n?.read && !n?.isRead)
      .map(n => api.patch(`/notifications/${n._id || n.id}/read`))
  );
}
// Alias retro-compatibile
export const readAll = markAllRead;

/**
 * Svuota tutte le notifiche.
 * - prova DELETE standard;
 * - fallback su path/metodi alternativi se presenti in alcuni backend.
 */
export async function deleteAll() {
  const attempts = [
    () => api.delete('/notifications'),
    () => api.post('/notifications/clear'),
    () => api.patch('/notifications/clear'),
  ];

  let lastErr;
  for (const tryCall of attempts) {
    try {
      await tryCall();
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
