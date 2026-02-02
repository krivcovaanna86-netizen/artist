import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTracks, getCategories, getUserPurchases } from '../../lib/api/client'
import { TrackCard } from '../../components/tracks/TrackCard'
import { CategoryFilter } from '../../components/tracks/CategoryFilter'
import { TrackListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { useAuthStore } from '../../stores/authStore'

type SortOption = 'createdAt' | 'playCount' | 'title'
type SortOrder = 'asc' | 'desc'

export default function CatalogPage() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

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
    queryKey: ['tracks', selectedCategory, debouncedSearch, sortBy, sortOrder],
    queryFn: () =>
      getTracks({
        category: selectedCategory || undefined,
        search: debouncedSearch || undefined,
        sort: sortBy,
        order: sortOrder,
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

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'createdAt', label: 'По дате' },
    { value: 'playCount', label: 'По популярности' },
    { value: 'title', label: 'По названию' },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header - Hidden on desktop (shown in AppLayout) */}
      <header className="lg:hidden sticky top-0 z-30 bg-tg-bg border-b border-tg-secondary-bg">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-tg-text mb-4">Каталог</h1>

          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Поиск треков..."
              value={search}
              onChange={handleSearchChange}
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

      {/* Desktop Search & Filters */}
      <div className="hidden lg:block mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Search */}
          <div className="w-full md:w-96">
            <Input
              placeholder="Поиск треков..."
              value={search}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-tg-hint">Сортировка:</span>
            <div className="flex bg-tg-secondary-bg rounded-lg p-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    if (sortBy === option.value) {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy(option.value)
                      setSortOrder('desc')
                    }
                  }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    sortBy === option.value
                      ? 'bg-tg-button text-tg-button-text'
                      : 'text-tg-text hover:bg-tg-bg'
                  }`}
                >
                  {option.label}
                  {sortBy === option.value && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mt-4">
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>
        )}
      </div>

      {/* Track list */}
      <div className="flex-1 p-4 lg:p-0 pt-2">
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
          <>
            {/* Results count */}
            <p className="text-sm text-tg-hint mb-4 hidden lg:block">
              Найдено: {tracksData.tracks.length} треков
            </p>

            {/* Mobile: List view */}
            <div className="space-y-2 lg:hidden">
              {tracksData.tracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isPurchased={purchasedTrackIds.has(track.id)}
                />
              ))}
            </div>

            {/* Desktop: Grid view */}
            <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {tracksData.tracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isPurchased={purchasedTrackIds.has(track.id)}
                  variant="card"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
