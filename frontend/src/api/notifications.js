// src/api/notifications.js
import api from './axios';

export async function getUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data?.count ?? 0;
}

export async function listNotifications({ limit = 20, skip = 0 } = {}) {
  const { data } = await api.get('/notifications', { params: { limit, skip } });
  return data?.items ?? [];
}

export async function markRead(id) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllRead() {
  // lato server accetta sia /mark-all-read che /markAllRead
  await api.post('/notifications/mark-all-read');
}

export async function deleteAll() {
  await api.delete('/notifications');
}






