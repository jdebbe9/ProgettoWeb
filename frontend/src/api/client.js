import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

let accessToken = null;
export function setAccessToken(t) { accessToken = t; }

const api = axios.create({
  baseURL,
  withCredentials: true
});

api.interceptors.request.use(cfg => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

let refreshing = null;
api.interceptors.response.use(
  res => res,
  async err => {
    const { response, config } = err || {};
    if (response && response.status === 401 && !config.__isRetryRequest) {
      try {
        if (!refreshing) {
          refreshing = axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
        }
        const { data } = await refreshing;
        refreshing = null;
        if (data?.accessToken) setAccessToken(data.accessToken);
        config.__isRetryRequest = true;
        return api(config);
      } catch {
        refreshing = null;
      }
    }
    throw err;
  }
);

export default api;
