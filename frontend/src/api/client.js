import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true // manda cookie httpOnly (refresh)
})

// --- Access token in memoria (mai in localStorage) ---
let accessToken = null
export function setAccessToken(token) { accessToken = token || null }
export function getAccessToken() { return accessToken }

// --- Interceptor: Authorization su ogni richiesta ---
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`
  }
  return config
})

// --- Gestione 401 → refresh + retry (con coda) ---
let isRefreshing = false
let subscribers = []

function subscribeTokenRefresh(cb) { subscribers.push(cb) }
function onRefreshed(token) {
  subscribers.forEach((cb) => cb(token))
  subscribers = []
}

async function doRefresh() {
  const { data } = await api.post('/auth/refresh') // cookie inviato automaticamente
  const newToken = data?.accessToken
  setAccessToken(newToken)
  return newToken
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error
    if (!response) throw error
    if (response.status === 401 && !config.__isRetryRequest) {
      config.__isRetryRequest = true
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const token = await doRefresh()
          onRefreshed(token)
          return api(config)
        } catch (e) {
          onRefreshed(null)
          throw e
        } finally {
          isRefreshing = false
        }
      } else {
        // Attendi che il primo refresh finisca
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (!token) return reject(error)
            config.headers['Authorization'] = `Bearer ${token}`
            resolve(api(config))
          })
        })
      }
    }
    throw error
  }
)

export default api
