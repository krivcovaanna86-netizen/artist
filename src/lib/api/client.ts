import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add init data to every request
api.interceptors.request.use((config) => {
  const initData = window.Telegram?.WebApp?.initData || ''
  if (initData) {
    config.headers['X-Telegram-Init-Data'] = initData
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized request')
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
export async function createPayment(type: 'subscription' | 'track', trackId?: string) {
  const { data } = await api.post<{
    paymentId: string
    paymentUrl: string
    amount: number
    description: string
  }>('/payments/create', { type, trackId })
  return data
}

export async function getPaymentStatus(id: string) {
  const { data } = await api.get<Payment>(`/payments/${id}/status`)
  return data
}
