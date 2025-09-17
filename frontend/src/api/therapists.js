// frontend/src/api/therapists.js
import api from './axios'


export async function getAllPatients() {
  const { data } = await api.get('/therapists/patients');
  return data; 
}

export async function getPatientDetails(id) {
  const { data } = await api.get(`/therapists/patients/${id}`);
  return data;
}
export async function searchPatients(params = {}) {
  const { data } = await api.get('/therapists/patients', { params }); 
  return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
}
export async function getPrivateNote(patientId) {
  const { data } = await api.get(`/therapist/notes/${patientId}`);
  return data; 
}

export async function savePrivateNote(patientId, text) {
  const { data } = await api.put(`/therapist/notes/${patientId}`, { text });
  return data; 
}