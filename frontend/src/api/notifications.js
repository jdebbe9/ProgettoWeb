// src/api/notifications.js
import api from './axios';

// Ritorna un numero
export async function getUnreadCount() {
  const { data } = await api.get('/notifications/unread-count', {
    headers: { 'Cache-Control': 'no-store' },
  });
  return typeof data === 'number' ? data : Number(data?.count) || 0;
}

// Ritorna un array di notifiche
export async function listNotifications({ limit = 20 } = {}) {
  const { data } = await api.get('/notifications', {
    params: { limit },
    headers: { 'Cache-Control': 'no-store' },
  });
  return Array.isArray(data) ? data : data?.items || [];
}

// Segna UNA notifica come letta
export async function markRead(id) {
  if (!id) return { ok: false };
  const { data } = await api.patch(`/notifications/${id}/read`, {});
  return data;
}

// Segna TUTTE come lette
export async function markAllRead() {
  const { data } = await api.patch('/notifications/mark-all', {});
  return data;
}

// Svuota tutte
export async function deleteAll() {
  const { data } = await api.delete('/notifications');
  return data;
}





