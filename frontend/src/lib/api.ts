import axios from 'axios'

// In dev: VITE_API_URL=http://localhost:5000 (proxied via Vite)
// In production: VITE_API_URL=https://your-backend.onrender.com
const BASE_URL = (import.meta.env.VITE_API_URL || '') + '/api'

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000,
})

// ── Request interceptor: attach token if stored ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pvt_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401/403 globally ───────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pvt_token')
      // Don't redirect from here — let the auth store handle it
    }
    return Promise.reject(error)
  }
)

export default api
