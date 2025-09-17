// src/api/auth.js
import api, { setAccessToken } from './axios';


export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  if (data?.accessToken) setAccessToken(data.accessToken);
  return data?.user || data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}


export async function me() {
  const { data } = await api.get('/auth/me');
  return data?.user || data;
}

export async function updateMe(payload) {
  const { data } = await api.patch('/auth/me', payload);
  return data;
}


export async function refresh() {
  const { data } = await api.post('/auth/refresh', {});
  if (data?.accessToken) setAccessToken(data.accessToken);
  return data;
}


export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}








