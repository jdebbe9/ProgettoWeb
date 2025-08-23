// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',          // backend proxy / stesso host in dev
  withCredentials: true,    // per il refresh cookie httpOnly
});

// Aggiunge il Bearer se presente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;


