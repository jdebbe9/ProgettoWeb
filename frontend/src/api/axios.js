// src/api/axios.js
import axios from 'axios';

let accessToken = null;
if (typeof window !== 'undefined' && window.localStorage) {
  const stored = window.localStorage.getItem('accessToken');
  accessToken = stored ? stored : null;
}

export function setAccessToken(t) {
  accessToken = t ? t : null;
  if (typeof window !== 'undefined' && window.localStorage) {
    if (t) window.localStorage.setItem('accessToken', t);
    else window.localStorage.removeItem('accessToken');
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('auth:token', { detail: { token: accessToken } }));
  }
}
export function getAccessToken() { return accessToken; }

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,         
});

const bare = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = 'Bearer ' + accessToken;
  }
  return config;
});

let refreshingPromise = null;
function performRefresh() {
  if (!refreshingPromise) {
    refreshingPromise = bare.post('/auth/refresh', null).then(
      (resp) => {
        refreshingPromise = null;
        const data = resp && resp.data ? resp.data : null;
        const tok = data && data.accessToken ? data.accessToken : null;
        return tok;
      },
      () => { refreshingPromise = null; return null; }
    );
  }
  return refreshingPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const resp = err && err.response ? err.response : null;
    const status = resp ? resp.status : 0;
    const cfg = (err && err.config) ? { ...err.config } : {};
    const url = cfg && cfg.url ? String(cfg.url) : '';
    const isRefreshCall = url.indexOf('/auth/refresh') !== -1;
    if (status !== 401 || cfg.__isRetryRequest || isRefreshCall) {
      return Promise.reject(err);
    }
    const newAccess = await performRefresh();
    if (!newAccess) {
      setAccessToken(null);
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
      return Promise.reject(err);
    }
    setAccessToken(newAccess);
    cfg.__isRetryRequest = true;
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = 'Bearer ' + newAccess;
    return api(cfg);
  }
);

export default api;



