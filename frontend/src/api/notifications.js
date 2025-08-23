// src/api/notifications.js
import api from './axios';

export async function getUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data?.count ?? 0;
}

export async function getInbox() {
  const { data } = await api.get('/notifications/inbox');
  return Array.isArray(data?.items) ? data.items : [];
}

export async function markAllRead() {
  await api.post('/notifications/mark-all-read');
}

export async function markRead(id) {
  await api.post(`/notifications/${id}/read`);
}



