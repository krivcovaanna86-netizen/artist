import { create } from 'zustand'
import { getUserProfile, type User } from '../lib/api/client'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  fetchUser: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  fetchUser: async () => {
    try {
      set({ isLoading: true, error: null })
      const user = await getUserProfile()
      set({ user, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch user:', error)
      set({ error: 'Не удалось загрузить профиль', isLoading: false })
    }
  },

  setUser: (user) => set({ user }),
}))
