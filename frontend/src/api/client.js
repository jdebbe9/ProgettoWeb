// src/api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // per il refresh cookie httpOnly
});

// token in memoria + persistenza
let accessToken = localStorage.getItem('accessToken') || null;
export function setAccessToken(token) {
  accessToken = token || null;
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}

// Attacca il Bearer se presente
api.interceptors.request.use((config) => {
  const t = accessToken || localStorage.getItem('accessToken');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Auto-refresh UNA volta su 401, poi riprova
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const cfg = err?.config || {};
    if (status === 401 && !cfg.__isRetryRequest) {
      try {
        refreshing = refreshing || axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const { data } = await refreshing;
        refreshing = null;
        if (data?.accessToken) setAccessToken(data.accessToken);
        cfg.__isRetryRequest = true;
        return api(cfg);
      } catch {
        refreshing = null;
        setAccessToken(null);
      }
    }
    throw err;
  }
);

export default api;


