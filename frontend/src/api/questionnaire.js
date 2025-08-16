import api from './client'

export async function submitQuestionnaire(payload) {
  const { data } = await api.post('/questionnaire', payload)
  return data
}
