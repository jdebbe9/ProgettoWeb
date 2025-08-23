// src/api/notifications.js
import api from './axios';

/** Lista notifiche: supporta sia array puro che { items, nextCursor } */
export async function listNotifications({ limit = 20, cursor = null } = {}) {
  const r = await api.get('/notifications', { params: { limit, cursor } });
  return r.data;
}

/** Conteggio non lette: accetta numero o {count}/{unread} */
export async function getUnreadCount() {
  const r = await api.get('/notifications/unread-count');
  const d = r.data;
  if (typeof d === 'number') return d;
  return d?.count ?? d?.unread ?? 0;
}

/** Segna TUTTE come lette → PATCH /notifications/read-all */
export async function markAllRead() {
  await api.patch('/notifications/read-all');
}

/** Segna SINGOLA come letta → PATCH /notifications/:id/read */
export async function markRead(id) {
  if (!id) return;
  await api.patch(`/notifications/${id}/read`);
}

/* Alias legacy: in alcuni componenti veniva usato clearAll(id) per marcare-la-letta */
export const clearAll = markRead;




