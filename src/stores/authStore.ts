import { create } from 'zustand'
import { getUserProfile, type User } from '../lib/api/client'

interface TelegramAuthUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  isDevMode: boolean
  telegramAuthUser: TelegramAuthUser | null
  fetchUser: () => Promise<void>
  setUser: (user: User | null) => void
  enableDevMode: () => void
  setTelegramAuthUser: (user: TelegramAuthUser) => void
  logout: () => void
}

// Check if we're in development mode (no Telegram WebApp)
const checkDevMode = () => {
  const hasTelegramWebApp = !!window.Telegram?.WebApp?.initData
  const hasTelegramAuth = !!localStorage.getItem('telegram_auth')
  return !hasTelegramWebApp && !hasTelegramAuth
}

// Get stored Telegram auth
const getStoredTelegramAuth = (): TelegramAuthUser | null => {
  try {
    const stored = localStorage.getItem('telegram_auth')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('[AuthStore] Failed to parse stored telegram auth:', e)
  }
  return null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  isDevMode: checkDevMode(),
  telegramAuthUser: getStoredTelegramAuth(),

  fetchUser: async () => {
    try {
      console.log('[AuthStore] Fetching user...')
      set({ isLoading: true, error: null })
      
      const user = await getUserProfile()
      console.log('[AuthStore] User fetched successfully:', user?.id)
      set({ user, isLoading: false, isDevMode: false })
    } catch (error: any) {
      console.error('[AuthStore] Failed to fetch user:', error)
      
      const status = error?.response?.status
      
      // Check if it's an auth error
      if (status === 401 || status === 403) {
        // If we have stored telegram auth, it might be invalid
        const hasTelegramAuth = !!localStorage.getItem('telegram_auth')
        
        if (hasTelegramAuth) {
          console.log('[AuthStore] Telegram auth invalid, clearing...')
          localStorage.removeItem('telegram_auth')
        }
        
        // Check if we're outside Telegram
        if (checkDevMode()) {
          set({ 
            error: null, 
            isLoading: false,
            isDevMode: true,
            telegramAuthUser: null
          })
          return
        }
      }
      
      set({ 
        error: `Не удалось загрузить профиль (${status || 'unknown'})`, 
        isLoading: false 
      })
    }
  },

  setUser: (user) => set({ user }),
  
  enableDevMode: () => {
    console.log('[AuthStore] Enabling dev mode')
    set({ isDevMode: true })
    localStorage.setItem('devMode', 'true')
  },

  setTelegramAuthUser: (telegramAuthUser) => {
    console.log('[AuthStore] Setting Telegram auth user:', telegramAuthUser.id)
    set({ telegramAuthUser, isDevMode: false })
  },

  logout: () => {
    console.log('[AuthStore] Logging out')
    localStorage.removeItem('telegram_auth')
    localStorage.removeItem('devMode')
    set({ 
      user: null, 
      telegramAuthUser: null, 
      isDevMode: checkDevMode(),
      error: null 
    })
  }
}))
