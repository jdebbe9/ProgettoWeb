// src/api/axios.js
import axios from 'axios';

/** token in memoria + localStorage per persistenza */
let accessToken = localStorage.getItem('accessToken') || null;

export function setAccessToken(t) {
  accessToken = t || null;
  if (t) localStorage.setItem('accessToken', t);
  else localStorage.removeItem('accessToken');
}
export function getAccessToken() {
  return accessToken;
}

/** Istanza principale per la tua app */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // serve per il cookie httpOnly di refresh
});

/** Istanza "bare" SOLO per /auth/refresh, senza interceptor */
const bare = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Allego Bearer se presente
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// 401 -> prova un refresh UNA volta (mai su /auth/refresh)
let refreshingPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const cfg = err?.config || {};

    // Se non è 401, o l'abbiamo già ritentata, o è proprio /auth/refresh -> basta
    const url = (cfg?.url || '').toString();
    const isRefreshCall = url.includes('/auth/refresh');
    if (status !== 401 || cfg.__isRetryRequest || isRefreshCall) {
      return Promise.reject(err);
    }

    try {
      if (!refreshingPromise) {
        // NIENTE Authorization qui; il cookie httpOnly basta
        refreshingPromise = bare.post('/auth/refresh', {});
      }

      const { data } = await refreshingPromise;
      refreshingPromise = null;

      if (data?.accessToken) {
        setAccessToken(data.accessToken);
        // ritenta la richiesta originale una sola volta
        cfg.__isRetryRequest = true;
        return api(cfg);
      }

      // se non c'è accessToken nella risposta, consideriamo l'utente non autenticato
      setAccessToken(null);
      return Promise.reject(err);
    } catch {
      refreshingPromise = null;
      setAccessToken(null);
      return Promise.reject(err);
    }
  }
);

export default api;



