// frontend/src/api/therapists.js
import api from './axios'

// Carica l'elenco di tutti i pazienti per il terapeuta
export async function getAllPatients() {
  const { data } = await api.get('/therapists/patients');
  return data; // Atteso: { items: [...] }
}

// Ottiene i dettagli completi di un singolo paziente
export async function getPatientDetails(id) {
  const { data } = await api.get(`/therapists/patients/${id}`);
  return data;
}
