import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTracks, getCategories, getUserPurchases, checkCanPlay } from '../../lib/api/client'
import { TrackCard } from '../../components/tracks/TrackCard'
import { CategoryFilter } from '../../components/tracks/CategoryFilter'
import { TrackListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { useAuthStore } from '../../stores/authStore'

export default function CatalogPage() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value)
    const timeoutId = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(timeoutId)
  }

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  // Fetch tracks
  const {
    data: tracksData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tracks', selectedCategory, debouncedSearch],
    queryFn: () =>
      getTracks({
        category: selectedCategory || undefined,
        search: debouncedSearch || undefined,
        limit: 50,
      }),
  })

  // Fetch user purchases to show status
  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases'],
    queryFn: getUserPurchases,
    enabled: !!user,
  })

  const purchasedTrackIds = new Set(purchases.map((p) => p.track.id))

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-tg-bg border-b border-tg-secondary-bg">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-tg-text mb-4">Каталог</h1>

          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Поиск треков..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          )}
        </div>
      </header>

      {/* Track list */}
      <div className="flex-1 p-4 pt-2">
        {isLoading ? (
          <TrackListSkeleton count={8} />
        ) : error ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            }
            title="Ошибка загрузки"
            description="Не удалось загрузить треки. Попробуйте позже."
          />
        ) : !tracksData?.tracks.length ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            }
            title="Треки не найдены"
            description={search ? 'Попробуйте изменить поисковый запрос' : 'В каталоге пока нет треков'}
          />
        ) : (
          <div className="space-y-2">
            {tracksData.tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isPurchased={purchasedTrackIds.has(track.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
