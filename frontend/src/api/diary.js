// frontend/src/api/diary.js
import api from './axios'

export async function listDiary() {
  const { data } = await api.get('/diary')
  return data
}

export async function createDiary(entry) {
  const { data } = await api.post('/diary', entry)
  return data
}


export async function updateDiary(id, entry) {
  const { data } = await api.patch(`/diary/${id}`, entry)
  return data
}

export async function deleteDiary(id) {
  await api.delete(`/diary/${id}`)
}
