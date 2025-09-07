// frontend/src/api/user.js
import api from './axios';

export async function getMe() {
  const { data } = await api.get('/user/me');
  return data;
}

export async function updateMe(patch) {
  const { data } = await api.patch('/user/me', patch);
  return data;
}
