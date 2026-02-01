import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getUserPurchases, getUserHistory, getUserSubscription } from '../../lib/api/client'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import { TrackListSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Badge } from '../../components/ui/Badge'
import { formatDate, formatPrice, formatRelativeTime } from '../../lib/utils/format'

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 bg-red-100 text-red-800 m-4 rounded-lg">
      <h2 className="font-bold mb-2">Ошибка:</h2>
      <pre className="text-sm whitespace-pre-wrap break-all">{error.message}</pre>
      <pre className="text-xs mt-2 whitespace-pre-wrap break-all">{error.stack}</pre>
    </div>
  )
}

function ProfilePageContent() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Fetch subscription
  const { data: subscription, isLoading: subLoading, error: subError } = useQuery({
    queryKey: ['subscription'],
    queryFn: getUserSubscription,
  })

  // Fetch purchases
  const { data: purchases = [], isLoading: purchasesLoading, error: purchasesError } = useQuery({
    queryKey: ['purchases'],
    queryFn: getUserPurchases,
  })

  // Fetch history
  const { data: historyData, isLoading: historyLoading, error: historyError } = useQuery({
    queryKey: ['history'],
    queryFn: () => getUserHistory({ limit: 10 }),
  })

  // Show any API errors
  const apiError = subError || purchasesError || historyError
  if (apiError) {
    return <ErrorFallback error={apiError as Error} />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <EmptyState
          title="Не авторизован"
          description="Откройте приложение через Telegram"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tg-secondary-bg">
      {/* Header */}
      <header className="bg-tg-bg p-6 pb-8">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-tg-button text-tg-button-text flex items-center justify-center text-2xl font-bold overflow-hidden">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.firstName} className="w-full h-full object-cover" />
            ) : (
              user.firstName?.[0]?.toUpperCase() || '?'
            )}
          </div>

          {/* Info */}
          <div>
            <h1 className="text-xl font-bold text-tg-text">
              {user.firstName} {user.lastName}
            </h1>
            {user.username && (
              <p className="text-tg-hint">@{user.username}</p>
            )}
          </div>
        </div>
      </header>

      {/* Subscription status */}
      <section className="mx-4 -mt-4 bg-tg-bg rounded-2xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-tg-text mb-1">Подписка</h2>
            {subLoading ? (
              <Skeleton width={120} height={16} />
            ) : subscription?.isActive ? (
              <div className="flex items-center gap-2">
                <Badge variant="success">Активна</Badge>
                {subscription.expiresAt && (
                  <span className="text-sm text-tg-hint">
                    до {formatDate(subscription.expiresAt)}
                  </span>
                )}
              </div>
            ) : (
              <Badge variant="default">Не активна</Badge>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/subscription')}
          >
            {subscription?.isActive ? 'Продлить' : 'Оформить'}
          </Button>
        </div>
      </section>

      {/* Purchased tracks */}
      <section className="bg-tg-bg mb-4">
        <div className="px-4 py-3 border-b border-tg-secondary-bg">
          <h2 className="font-medium text-tg-text">Купленные треки</h2>
        </div>
        
        {purchasesLoading ? (
          <TrackListSkeleton count={3} />
        ) : purchases.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Нет покупок"
              description="Купленные треки появятся здесь"
            />
          </div>
        ) : (
          <div className="divide-y divide-tg-secondary-bg">
            {purchases.slice(0, 5).map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-tg-secondary-bg transition-colors"
                onClick={() => navigate(`/track/${purchase.track.id}`)}
              >
                {/* Cover */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-tg-secondary-bg flex-shrink-0">
                  {purchase.track.coverUrl ? (
                    <img
                      src={purchase.track.coverUrl}
                      alt={purchase.track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-tg-text truncate">
                    {purchase.track.title}
                  </p>
                  <p className="text-xs text-tg-hint truncate">
                    {purchase.track.artist}
                  </p>
                </div>

                {/* Price */}
                <div className="text-xs text-tg-hint">
                  {formatPrice(purchase.price)}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {purchases.length > 5 && (
          <div className="p-4 pt-0">
            <Button variant="ghost" fullWidth size="sm">
              Показать все ({purchases.length})
            </Button>
          </div>
        )}
      </section>

      {/* History */}
      <section className="bg-tg-bg">
        <div className="px-4 py-3 border-b border-tg-secondary-bg">
          <h2 className="font-medium text-tg-text">История прослушиваний</h2>
        </div>
        
        {historyLoading ? (
          <TrackListSkeleton count={3} />
        ) : !historyData?.history?.length ? (
          <div className="p-4">
            <EmptyState
              title="История пуста"
              description="Прослушанные треки появятся здесь"
            />
          </div>
        ) : (
          <div className="divide-y divide-tg-secondary-bg">
            {historyData.history.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-tg-secondary-bg transition-colors"
                onClick={() => navigate(`/track/${item.track.id}`)}
              >
                {/* Cover */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-tg-secondary-bg flex-shrink-0">
                  {item.track.coverUrl ? (
                    <img
                      src={item.track.coverUrl}
                      alt={item.track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-tg-text truncate">
                    {item.track.title}
                  </p>
                  <p className="text-xs text-tg-hint truncate">
                    {item.track.artist}
                  </p>
                </div>

                {/* Time */}
                <div className="text-xs text-tg-hint">
                  {formatRelativeTime(item.playedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default function ProfilePage() {
  try {
    return <ProfilePageContent />
  } catch (error) {
    return <ErrorFallback error={error as Error} />
  }
}
