// backend/services/notify.js
const User = require('../models/User');
const { createFor } = require('../controllers/notificationController');

/**
 * Restituisce l'ID del terapeuta unico del sistema.
 * Ordine di risoluzione:
 * 1) THERAPIST_ID (diretto da .env)
 * 2) THERAPIST_EMAIL (match su utente con role: 'therapist')
 * 3) Primo utente con role: 'therapist'
 */
async function getTherapistId() {
  // 1) .env con ID esplicito
  if (process.env.THERAPIST_ID) return process.env.THERAPIST_ID;

  // 2) .env con email
  if (process.env.THERAPIST_EMAIL) {
    const tByEmail = await User.findOne({
      email: process.env.THERAPIST_EMAIL,
      role: 'therapist',
    }).select('_id').lean();
    if (tByEmail?._id) return tByEmail._id.toString();
  }

  // 3) fallback
  const t = await User.findOne({ role: 'therapist' }).select('_id').lean();
  return t?._id?.toString() || null;
}

/**
 * Nome visualizzato per un utente (Nome Cognome) con fallback "Paziente".
 */
async function getDisplayName(userId) {
  const u = await User.findById(userId).select('name surname').lean();
  const n = [u?.name, u?.surname].filter(Boolean).join(' ').trim();
  return n || 'Paziente';
}

/**
 * Notifica il terapeuta “default” (se presente).
 * Suggerito solo quando non hai già l'ID del terapeuta coinvolto.
 */
async function notifyTherapist({ type, title, body = '', data = {} }) {
  const therapistId = await getTherapistId();
  if (!therapistId) return;
  await createFor({ userId: therapistId, type, title, body, data });
}

/**
 * Notifica un utente arbitrario (paziente/terapeuta).
 */
async function notifyUser(userId, { type, title, body = '', data = {} }) {
  if (!userId) return;
  await createFor({ userId, type, title, body, data });
}

module.exports = {
  getTherapistId,
  getDisplayName,
  notifyTherapist,
  notifyUser,
};

