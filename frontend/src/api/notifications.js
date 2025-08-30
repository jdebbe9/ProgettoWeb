import api from './axios';

// Lista notifiche (paginata)
export async function listNotifications({ limit = 20, cursor = null } = {}) {
  const params = {};
  if (limit) params.limit = limit;
  if (cursor) params.cursor = cursor;
  const { data } = await api.get('/notifications', { params });
  // backend può restituire { items, nextCursor } oppure direttamente array
  return data?.items ? data : (Array.isArray(data) ? data : []);
}

// Conteggio non lette
export async function getUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data?.count ?? 0;
}

// Segna una notifica come letta
export async function markRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
}

// Segna tutte come lette
export async function markAllRead() {
  const { data } = await api.patch('/notifications/read-all');
  return data;
}

// Svuota tutte (DELETE /notifications)
export async function deleteAll() {
  const { data } = await api.delete('/notifications');
  return data;
}





