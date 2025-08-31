import api from './axios';

export async function listTasks(params={}) {
  const { data } = await api.get('/tasks', { params });
  return data?.items || [];
}
export async function createTask(payload) {
  const { data } = await api.post('/tasks', payload);
  return data;
}
export async function updateTask(id, patch) {
  const { data } = await api.patch(`/tasks/${id}`, patch);
  return data;
}
export async function deleteTask(id) {
  await api.delete(`/tasks/${id}`);
}
