// src/api/auth.js
import api, { setAccessToken } from './client'


// LOGIN
export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password })
  if (data?.accessToken) setAccessToken(data.accessToken)
  return data?.user || data
}

// LOGOUT
export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    setAccessToken(null)
  }
}

// ME
export async function me() {
  const { data } = await api.get('/auth/me')
  return data?.user || data
}

export async function updateMe(payload) {
  const { data } = await api.patch('/auth/me', payload);
  return data;
}

// REFRESH
export async function refresh() {
  const { data } = await api.post('/auth/refresh', {})
  if (data?.accessToken) setAccessToken(data.accessToken)
  return data
}

// REGISTER (paziente)
export async function register(payload) {
  const { data } = await api.post('/auth/register', payload)
  return data
}

// PASSWORD RESET
export async function forgotPassword(email) {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}
export async function resetPassword({ token, password }) {
  const { data } = await api.post('/auth/reset-password', { token, password })
  return data
}






