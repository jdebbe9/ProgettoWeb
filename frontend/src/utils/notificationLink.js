// frontend/src/utils/notificationLink.js
export function getNotificationLink(n) {
  if (!n) return '/';
  if (n.link) return n.link;

  const t = n.type || '';
  if (t.startsWith('APPT_')) return '/appointments';
  if (t === 'READING_ASSIGNED') return '/materials';

  return '/';
}
