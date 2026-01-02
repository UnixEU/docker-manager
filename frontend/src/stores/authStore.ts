import { create } from 'zustand'
import api from '@/lib/api'

interface User {
  id: number
  username: string
  email: string
  full_name?: string
  is_active: boolean
  is_superuser: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, fullName?: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true })
    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('password', password)
      
      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      
      const { access_token } = response.data
      localStorage.setItem('token', access_token)
      set({ token: access_token })
      
      // Fetch user data
      const userResponse = await api.get('/auth/me')
      set({ user: userResponse.data, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (username: string, email: string, password: string, fullName?: string) => {
    set({ isLoading: true })
    try {
      await api.post('/auth/register', {
        username,
        email,
        password,
        full_name: fullName,
      })
      set({ isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  fetchUser: async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await api.get('/auth/me')
      set({ user: response.data })
    } catch (error) {
      set({ user: null, token: null })
      localStorage.removeItem('token')
    }
  },
}))
