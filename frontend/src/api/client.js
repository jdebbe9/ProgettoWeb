// src/api/client.js
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

let accessToken = null
export function setAccessToken(t) { accessToken = t || null }

const api = axios.create({
  baseURL,
  withCredentials: true // per mandare il cookie httpOnly di refresh
})

// Allego Authorization se ho l'access token in memoria
api.interceptors.request.use(cfg => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`
  return cfg
})

// 401 -> prova un refresh UNA volta e ripeti la richiesta
let refreshing = null
api.interceptors.response.use(
  res => res,
  async err => {
    const status = err?.response?.status
    const config = err?.config || {}
    if (status === 401 && !config.__isRetryRequest) {
      if (!refreshing) {
        refreshing = axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true })
      }
      try {
        const { data } = await refreshing
        refreshing = null
        if (data?.accessToken) setAccessToken(data.accessToken)
        config.__isRetryRequest = true
        return api(config)
      } catch {
        refreshing = null
      }
    }
    throw err
  }
)

export default api

