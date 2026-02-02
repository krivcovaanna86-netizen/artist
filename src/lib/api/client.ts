import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Check if we're in dev mode
const isDevMode = () => {
  return !window.Telegram?.WebApp?.initData && 
         !localStorage.getItem('telegram_auth') && 
         localStorage.getItem('devMode') === 'true'
}

// Get Telegram auth header
const getTelegramAuthHeader = (): string | null => {
  try {
    const stored = localStorage.getItem('telegram_auth')
    if (stored) {
      // Convert to query string format similar to initData
      const data = JSON.parse(stored)
      const params = new URLSearchParams()
      params.set('id', data.id.toString())
      params.set('first_name', data.first_name)
      if (data.last_name) params.set('last_name', data.last_name)
      if (data.username) params.set('username', data.username)
      if (data.photo_url) params.set('photo_url', data.photo_url)
      params.set('auth_date', data.auth_date.toString())
      params.set('hash', data.hash)
      return params.toString()
    }
  } catch (e) {
    console.error('[API] Failed to parse telegram auth:', e)
  }
  return null
}

// Add init data to every request
api.interceptors.request.use((config) => {
  console.log(`[API] Request: ${config.method?.toUpperCase()} ${config.url}`)
  
  // First priority: Telegram WebApp initData
  const initData = window.Telegram?.WebApp?.initData || ''
  if (initData) {
    console.log('[API] Using Telegram WebApp initData')
    config.headers['X-Telegram-Init-Data'] = initData
    return config
  }
  
  // Second priority: Telegram Login Widget auth
  const telegramAuth = getTelegramAuthHeader()
  if (telegramAuth) {
    console.log('[API] Using Telegram Login auth')
    config.headers['X-Telegram-Auth'] = telegramAuth
    return config
  }
  
  // Third priority: Dev mode
  if (isDevMode()) {
    console.log('[API] Using dev mode')
    config.headers['X-Dev-Mode'] = 'true'
  }
  
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    const status = error.response?.status
    const url = error.config?.url
    console.error(`[API] Error: ${status} ${url}`, error.response?.data || error.message)
    
    if (status === 401) {
      console.error('[API] Unauthorized - auth info:', {
        hasTelegramWebApp: !!window.Telegram?.WebApp?.initData,
        hasTelegramAuth: !!localStorage.getItem('telegram_auth'),
        isDevMode: isDevMode()
      })
    }
    return Promise.reject(error)
  }
)

export default api

// API Types
export interface Track {
  id: string
  title: string
  artist: string
  duration: number
  coverUrl: string | null
  price: number
  playCount: number
  categories: Category[]
  createdAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  trackCount?: number
}

export interface User {
  id: string
  telegramId: string
  username: string | null
  firstName: string
  lastName: string | null
  photoUrl: string | null
  isAdmin: boolean
  subscriptionUntil: string | null
  hasActiveSubscription: boolean
  createdAt: string
}

export interface Purchase {
  id: string
  purchasedAt: string
  price: number
  track: {
    id: string
    title: string
    artist: string
    duration: number
    coverUrl: string | null
    categories: Category[]
  }
}

export interface PlayHistory {
  id: string
  playedAt: string
  completed: boolean
  track: {
    id: string
    title: string
    artist: string
    duration: number
    coverUrl: string | null
    categories: Category[]
  }
}

export interface PlayCheckResult {
  canPlay: boolean
  reason: 'subscription' | 'purchased' | 'free_limit' | 'limit_exceeded'
  remainingPlays?: number
  subscriptionUntil?: string
}

export interface Payment {
  id: string
  type: 'subscription' | 'track'
  amount: number
  status: 'pending' | 'success' | 'failed' | 'refunded'
  track: {
    id: string
    title: string
    artist: string
  } | null
  createdAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Functions

// Tracks
export async function getTracks(params?: {
  category?: string
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}) {
  const { data } = await api.get<{ tracks: Track[]; pagination: Pagination }>('/tracks', { params })
  return data
}

export async function getTrack(id: string) {
  const { data } = await api.get<Track>(`/tracks/${id}`)
  return data
}

// Categories
export async function getCategories() {
  const { data } = await api.get<{ categories: Category[] }>('/categories')
  return data.categories
}

// User
export async function getUserProfile() {
  const { data } = await api.get<{ user: User }>('/user/profile')
  return data.user
}

export async function getUserPurchases() {
  const { data } = await api.get<{ purchases: Purchase[] }>('/user/purchases')
  return data.purchases
}

export async function getUserSubscription() {
  const { data } = await api.get<{
    subscription: {
      isActive: boolean
      expiresAt: string | null
      price: number
      history: Array<{
        id: string
        price: number
        startedAt: string
        expiresAt: string
      }>
    }
  }>('/user/subscription')
  return data.subscription
}

export async function getUserHistory(params?: { page?: number; limit?: number }) {
  const { data } = await api.get<{ history: PlayHistory[]; pagination: Pagination }>('/user/history', { params })
  return data
}

// Playback
export async function checkCanPlay(trackId: string) {
  const { data } = await api.get<PlayCheckResult>(`/can-play/${trackId}`)
  return data
}

export async function recordPlay(trackId: string, action?: 'complete') {
  const { data } = await api.post<PlayCheckResult & { success: boolean }>(`/play/${trackId}`, { action })
  return data
}

export async function getStreamUrl(trackId: string) {
  const { data } = await api.get<{ streamUrl: string; expiresIn: number }>(`/stream/${trackId}`)
  return data
}

// Payments
export async function createPayment(type: 'subscription' | 'track', trackId?: string, enableAutoRenewal?: boolean) {
  const { data } = await api.post<{
    paymentId: string
    paymentUrl: string
    amount: number
    description: string
  }>('/payments/create', { type, trackId, enableAutoRenewal })
  return data
}

export async function getPaymentStatus(id: string) {
  const { data } = await api.get<Payment>(`/payments/${id}/status`)
  return data
}
