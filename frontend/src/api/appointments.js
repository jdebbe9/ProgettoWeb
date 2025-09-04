// frontend/src/api/appointments.js
import api from './axios';

export async function listAppointments() {
  const { data } = await api.get('/appointments');
  return data;
}

/**
 * Crea una richiesta appuntamento.
 * Supporta:
 * - therapistId (opzionale, ignorato se il backend risolve lato server)
 * - requestedOnline (bool) per la preferenza del paziente
 */
export async function createAppointment({ date, therapistId, requestedOnline }) {
  const body = { date };

  if (typeof requestedOnline === 'boolean') {
    body.requestedOnline = requestedOnline;
  }

  if (therapistId) {
    // Compat con backend esistente
    body.therapistId = therapistId;
    body.therapist = therapistId;
  }

  const { data } = await api.post('/appointments', body);
  return data;
}

export async function cancelAppointment(id) {
  await api.delete(`/appointments/${id}`);
}

/**
 * Aggiorna un appuntamento (es. { status, date, isOnline, videoLink })
 */
export async function updateAppointment(id, patch) {
  const { data } = await api.put(`/appointments/${id}`, patch);
  return data;
}


