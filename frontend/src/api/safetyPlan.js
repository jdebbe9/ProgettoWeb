import api from './axios';

export async function getSafetyPlan() {
  const { data } = await api.get('/safety-plan');
  return data;
}
export async function saveSafetyPlan(payload) {
  const { data } = await api.put('/safety-plan', payload);
  return data;
}
