// frontend/src/api/appointments.js
import api from './axios';

export async function listAppointments() {
  const { data } = await api.get('/appointments');
  return data;
}


export async function createAppointment({ date, therapistId, requestedOnline }) {
  const body = { date };

  if (typeof requestedOnline === 'boolean') {
    body.requestedOnline = requestedOnline;
  }

  if (therapistId) {
    
    body.therapistId = therapistId;
    body.therapist = therapistId;
  }

  const { data } = await api.post('/appointments', body);
  return data;
}

export async function cancelAppointment(id) {
  await api.delete(`/appointments/${id}`);
}


export async function updateAppointment(id, patch) {
  const { data } = await api.put(`/appointments/${id}`, patch);
  return data;
}


