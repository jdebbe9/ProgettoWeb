import api from './client'

export async function listDiary() {
  const { data } = await api.get('/diary')
  return data
}

export async function createDiary(entry) {
  const { data } = await api.post('/diary', entry)
  return data
}

export async function updateDiary(id, entry) {
  const { data } = await api.put(`/diary/${id}`, entry)
  return data
}

export async function deleteDiary(id) {
  const { data } = await api.delete(`/diary/${id}`)
  return data
}
