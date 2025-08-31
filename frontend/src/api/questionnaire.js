import api from './axios'

export async function submitQuestionnaire(payload) {
  const { data } = await api.post('/questionnaire', payload)
  return data
}
