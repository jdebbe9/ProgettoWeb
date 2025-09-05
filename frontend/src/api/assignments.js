// frontend/src/api/assignments.js
import api from './axios';

/**
 * Lista assegnazioni (paziente vede le sue; terapeuta vede le proprie, opz. filtrate per patient)
 * @param {Object} params es. { patient: '<id>' }
 */
export async function listAssignments(params = {}) {
  const { data } = await api.get('/assignments', { params });
  return data?.items || [];
}

/**
 * Crea una nuova assegnazione (solo terapeuta)
 * @param {Object} payload { patientId, itemType: 'Article'|'Book', itemId, note? }
 */
export async function createAssignment(payload) {
  const { data } = await api.post('/assignments', payload);
  return data;
}

/**
 * Aggiorna un'assegnazione (terapeuta: status/note; paziente: status in ['assigned','in_progress','done'])
 */
export async function updateAssignment(id, patch) {
  const { data } = await api.patch(`/assignments/${id}`, patch);
  return data;
}

/**
 * Rimuove un'assegnazione (solo terapeuta proprietario)
 */
export async function removeAssignment(id) {
  await api.delete(`/assignments/${id}`);
}

