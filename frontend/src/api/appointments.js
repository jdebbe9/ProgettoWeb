// src/api/appointments.js
import api from './client'

export async function listAppointments() {
  const { data } = await api.get('/appointments')
  return data
}

export async function createAppointment(payload) {
  const { data } = await api.post('/appointments', payload)
  return data
}

export async function cancelAppointment(id) {
  const { data } = await api.delete(`/appointments/${id}`)
  return data
}

// NEW: update (per accettare / riprogrammare)
export async function updateAppointment(id, patch) {
  const { data } = await api.put(`/appointments/${id}`, patch)
  return data
}

