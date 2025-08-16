// src/api/therapists.js
import api from './client'

// GET /therapists?q=...
export async function listTherapists(q) {
  const { data } = await api.get('/therapists', { params: q ? { q } : {} })
  return data // atteso: [{ _id, name, specialization, bio? }]
}

// GET /therapists/:id
export async function getTherapist(id) {
  const { data } = await api.get(`/therapists/${id}`)
  return data // atteso: { _id, name, specialization, bio? }
}
