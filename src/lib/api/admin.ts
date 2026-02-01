import axios from 'axios'
import type { Category, Pagination, User } from './client'

const api = axios.create({
  baseURL: '/api/admin',
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

// Upload
export async function getUploadUrl(filename: string, type: 'track' | 'cover') {
  const { data } = await api.post<{ uploadUrl: string; path: string; token: string }>('/upload-url', {
    filename,
    type,
  })
  return data
}

export async function uploadFile(uploadUrl: string, file: File) {
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type,
    },
  })
}

// Tracks
export async function getAdminTracks(params?: {
  search?: string
  category?: string
  published?: string
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}) {
  const { data } = await api.get<{ tracks: AdminTrack[]; pagination: Pagination }>('/tracks', { params })
  return data
}

export async function getAdminTrack(id: string) {
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
  const { data } = await api.post<AdminTrack>('/tracks', trackData)
  return data
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
  const { data } = await api.put<AdminTrack>(`/tracks/${id}`, trackData)
  return data
}

export async function deleteTrack(id: string) {
  await api.delete(`/tracks/${id}`)
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
