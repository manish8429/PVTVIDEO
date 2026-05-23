import { create } from 'zustand'
import api from '../lib/api'

export interface User {
  _id: string
  name: string
  email: string
  avatar: string
  isVerified: boolean
  role: string
  isUploader: boolean
  lastLogin?: string
  createdAt?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  // Actions
  setUser: (user: User, token?: string) => void
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('pvt_token'),
  isLoading: true,
  isAuthenticated: false,

  setUser: (user, token) => {
    if (token) {
      localStorage.setItem('pvt_token', token)
    }
    set({ user, isAuthenticated: true, token: token || get().token })
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch (_) {}
    localStorage.removeItem('pvt_token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      if (data.success) {
        set({ user: data.user, isAuthenticated: true })
      }
    } catch (_) {
      localStorage.removeItem('pvt_token')
      set({ user: null, isAuthenticated: false, token: null })
    }
  },

  initialize: async () => {
    set({ isLoading: true })
    await get().fetchMe()
    set({ isLoading: false })
  },
}))
