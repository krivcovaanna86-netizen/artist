import axios, { AxiosError } from 'axios'
import type { Category, Pagination, User } from './client'

const api = axios.create({
  baseURL: '/api/admin',
  timeout: 60000, // 60 seconds for uploads
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
    console.error('[Admin API] Failed to parse telegram auth:', e)
  }
  return null
}

// Add init data to every request with detailed logging
api.interceptors.request.use((config) => {
  console.log(`[Admin API] 📤 Request: ${config.method?.toUpperCase()} ${config.url}`)
  if (config.data) {
    console.log('[Admin API] Request data:', config.data)
  }
  
  // First priority: Telegram WebApp initData
  const initData = window.Telegram?.WebApp?.initData || ''
  if (initData) {
    console.log('[Admin API] Using Telegram WebApp initData')
    config.headers['X-Telegram-Init-Data'] = initData
    return config
  }
  
  // Second priority: Telegram Login Widget auth
  const telegramAuth = getTelegramAuthHeader()
  if (telegramAuth) {
    console.log('[Admin API] Using Telegram Login auth')
    config.headers['X-Telegram-Auth'] = telegramAuth
    return config
  }
  
  // Third priority: Dev mode
  if (isDevMode()) {
    console.log('[Admin API] Using dev mode')
    config.headers['X-Dev-Mode'] = 'true'
  }
  
  return config
})

// Response interceptor with detailed logging
api.interceptors.response.use(
  (response) => {
    console.log(`[Admin API] ✅ Response: ${response.status} ${response.config.url}`)
    if (response.data) {
      const summary = JSON.stringify(response.data).slice(0, 200)
      console.log(`[Admin API] Response data: ${summary}${summary.length >= 200 ? '...' : ''}`)
    }
    return response
  },
  (error: AxiosError) => {
    const status = error.response?.status
    const url = error.config?.url
    console.error(`[Admin API] ❌ Error: ${status || 'network'} ${url}`)
    console.error('[Admin API] Error details:', error.response?.data || error.message)
    
    if (status === 401) {
      console.error('[Admin API] Auth info:', {
        hasTelegramWebApp: !!window.Telegram?.WebApp?.initData,
        hasTelegramAuth: !!localStorage.getItem('telegram_auth'),
        isDevMode: isDevMode()
      })
    }
    
    return Promise.reject(error)
  }
)

// Types
export interface AdminTrack {
  id: string
  title: string
  artist: string
  duration: number
  coverUrl: string | null
  filePath: string
  coverPath: string | null
  price: number
  isPublished: boolean
  playCount: number
  purchaseCount: number
  revenue: number
  categories: Category[]
  createdAt: string
  updatedAt: string
}

export interface AdminUser extends User {
  purchaseCount: number
  playCount: number
  totalSpent: number
}

export interface AdminPayment {
  id: string
  type: 'subscription' | 'track'
  amount: number
  status: 'pending' | 'success' | 'failed' | 'refunded'
  providerPaymentId: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    telegramId: string
    username: string | null
    firstName: string
    lastName: string | null
  }
  track: {
    id: string
    title: string
    artist: string
    coverUrl: string | null
  } | null
}

export interface AdminCategory extends Category {
  sortOrder: number
  trackCount: number
  createdAt: string
}

export interface StatsOverview {
  users: {
    total: number
    activeToday: number
    activeWeek: number
    activeMonth: number
  }
  plays: {
    today: number
    week: number
    month: number
  }
  revenue: {
    today: number
    week: number
    month: number
    total: number
  }
  subscriptions: {
    active: number
    newWeek: number
    newMonth: number
  }
  tracks: {
    total: number
    purchases: number
  }
}

export interface TrackStats {
  id: string
  title: string
  artist: string
  coverUrl: string | null
  playCount: number
  purchaseCount: number
  revenue: number
}

export interface ChartData {
  labels: string[]
  plays: number[]
  revenue: number[]
  users: number[]
  subscriptions: number[]
}

export interface AppSettings {
  subscriptionPrice: number
  dailyPlayLimit: number
  defaultTrackPrice: number
  supportEmail: string
  supportTelegram: string
}

// Upload with detailed logging
export async function getUploadUrl(filename: string, type: 'track' | 'cover') {
  console.log(`[Upload] 🔗 Getting upload URL for: ${filename} (type: ${type})`)
  
  try {
    const { data } = await api.post<{ uploadUrl: string; path: string; token: string }>('/upload-url', {
      filename,
      type,
    })
    
    console.log(`[Upload] ✅ Got upload URL, path: ${data.path}`)
    return data
  } catch (error) {
    console.error(`[Upload] ❌ Failed to get upload URL:`, error)
    throw error
  }
}

export async function uploadFile(uploadUrl: string, file: File) {
  console.log(`[Upload] ⬆️ Starting file upload:`, {
    name: file.name,
    type: file.type,
    size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    url: uploadUrl.substring(0, 100) + '...'
  })
  
  try {
    const response = await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      timeout: 120000, // 2 minutes for large files
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          console.log(`[Upload] 📊 Progress: ${percentCompleted}%`)
        }
      }
    })
    
    console.log(`[Upload] ✅ File uploaded successfully, status: ${response.status}`)
    return response
  } catch (error) {
    console.error(`[Upload] ❌ File upload failed:`, error)
    
    if (axios.isAxiosError(error)) {
      console.error(`[Upload] Status: ${error.response?.status}`)
      console.error(`[Upload] Response:`, error.response?.data)
    }
    
    throw error
  }
}

// Tracks with logging
export async function getAdminTracks(params?: {
  search?: string
  category?: string
  published?: string
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}) {
  console.log('[Admin API] Fetching tracks with params:', params)
  const { data } = await api.get<{ tracks: AdminTrack[]; pagination: Pagination }>('/tracks', { params })
  console.log(`[Admin API] Fetched ${data.tracks.length} tracks`)
  return data
}

export async function getAdminTrack(id: string) {
  console.log('[Admin API] Fetching track:', id)
  const { data } = await api.get<AdminTrack>(`/tracks/${id}`)
  return data
}

export async function createTrack(trackData: {
  title: string
  artist: string
  duration?: number
  filePath: string
  coverPath?: string
  price?: number
  categoryIds?: string[]
  isPublished?: boolean
}) {
  console.log('[Admin API] 🎵 Creating track:', trackData)
  
  try {
    const { data } = await api.post<AdminTrack>('/tracks', trackData)
    console.log('[Admin API] ✅ Track created:', data.id)
    return data
  } catch (error) {
    console.error('[Admin API] ❌ Failed to create track:', error)
    throw error
  }
}

export async function updateTrack(
  id: string,
  trackData: {
    title?: string
    artist?: string
    duration?: number
    filePath?: string
    coverPath?: string
    price?: number
    categoryIds?: string[]
    isPublished?: boolean
  }
) {
  console.log('[Admin API] 🎵 Updating track:', id, trackData)
  
  try {
    const { data } = await api.put<AdminTrack>(`/tracks/${id}`, trackData)
    console.log('[Admin API] ✅ Track updated:', data.id)
    return data
  } catch (error) {
    console.error('[Admin API] ❌ Failed to update track:', error)
    throw error
  }
}

export async function deleteTrack(id: string) {
  console.log('[Admin API] 🗑️ Deleting track:', id)
  await api.delete(`/tracks/${id}`)
  console.log('[Admin API] ✅ Track deleted')
}

// Categories
export async function getAdminCategories() {
  const { data } = await api.get<{ categories: AdminCategory[] }>('/categories')
  return data.categories
}

export async function createCategory(categoryData: {
  name: string
  slug: string
  icon?: string
  sortOrder?: number
}) {
  const { data } = await api.post<AdminCategory>('/categories', categoryData)
  return data
}

export async function updateCategory(
  id: string,
  categoryData: {
    name?: string
    slug?: string
    icon?: string
    sortOrder?: number
  }
) {
  const { data } = await api.put<AdminCategory>(`/categories/${id}`, categoryData)
  return data
}

export async function deleteCategory(id: string) {
  await api.delete(`/categories/${id}`)
}

// Users
export async function getAdminUsers(params?: {
  search?: string
  filter?: 'subscribed' | 'unsubscribed' | 'purchased'
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}) {
  const { data } = await api.get<{ users: AdminUser[]; pagination: Pagination }>('/users', { params })
  return data
}

export async function getAdminUser(id: string) {
  const { data } = await api.get<{
    user: AdminUser
    purchases: any[]
    subscriptions: any[]
    payments: any[]
    recentPlays: any[]
  }>(`/users/${id}`)
  return data
}

// Payments
export async function getAdminPayments(params?: {
  type?: 'subscription' | 'track'
  status?: 'pending' | 'success' | 'failed' | 'refunded'
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}) {
  const { data } = await api.get<{ payments: AdminPayment[]; pagination: Pagination }>('/payments', { params })
  return data
}

// Stats
export async function getStatsOverview() {
  const { data } = await api.get<StatsOverview>('/stats/overview')
  return data
}

export async function getTrackStats(params?: { sort?: string; order?: string; limit?: number }) {
  const { data } = await api.get<{
    topByPlays: TrackStats[]
    topBySales: TrackStats[]
    allTracks: TrackStats[]
  }>('/stats/tracks', { params })
  return data
}

export async function getChartData(days = 30) {
  const { data } = await api.get<ChartData>('/stats/charts', { params: { days } })
  return data
}

// Settings
export async function getSettings() {
  const { data } = await api.get<{ settings: AppSettings }>('/settings')
  return data.settings
}

export async function updateSettings(settings: Partial<AppSettings>) {
  const { data } = await api.put<{ settings: AppSettings }>('/settings', settings)
  return data.settings
}
