// frontend/src/api/assignments.js
import api from './axios';

export async function listAssignments(params = {}) {
  const { data } = await api.get('/assignments', { params });
  return data?.items || [];
}

export async function updateAssignment(id, patch) {
  const { data } = await api.patch(`/assignments/${id}`, patch);
  return data;
}
