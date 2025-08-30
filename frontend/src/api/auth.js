// src/api/auth.js
import api, { setAccessToken } from './axios';

// LOGIN
export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  if (data?.accessToken) setAccessToken(data.accessToken);
  return data?.user || data;
}

// LOGOUT
export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

// ME
export async function me() {
  const { data } = await api.get('/auth/me');
  return data?.user || data;
}

export async function updateMe(payload) {
  const { data } = await api.patch('/auth/me', payload);
  return data;
}

// REFRESH (manuale, se mai ti servisse esplicitamente)
// NB: l'interceptor in axios.js evita loop su /auth/refresh
export async function refresh() {
  const { data } = await api.post('/auth/refresh', {});
  if (data?.accessToken) setAccessToken(data.accessToken);
  return data;
}

// REGISTER (paziente)
export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

// PASSWORD RESET
export async function forgotPassword(emailOrObj) {
  const email = typeof emailOrObj === 'string' ? emailOrObj : emailOrObj?.email;
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword({ token, password }) {
  const { data } = await api.post('/auth/reset-password', { token, password });
  return data;
}







