import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminUsers } from '../../lib/api/admin'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatPrice, formatNumber, formatDate } from '../../lib/utils/format'

type UserFilter = 'all' | 'subscribed' | 'unsubscribed' | 'purchased'

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<UserFilter>('all')

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, filter],
    queryFn: () =>
      getAdminUsers({
        search: search || undefined,
        filter: filter === 'all' ? undefined : filter,
        limit: 50,
      }),
  })

  const filters: { value: UserFilter; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'subscribed', label: 'С подпиской' },
    { value: 'unsubscribed', label: 'Без подписки' },
    { value: 'purchased', label: 'Покупавшие' },
  ]

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        placeholder="Поиск по имени или username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-tg-button text-tg-button-text'
                : 'bg-tg-bg text-tg-text hover:bg-tg-secondary-bg'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="bg-tg-bg rounded-xl p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton width={48} height={48} variant="circular" />
              <div className="flex-1">
                <Skeleton width="60%" height={18} className="mb-2" />
                <Skeleton width="40%" height={14} />
              </div>
            </div>
          ))}
        </div>
      ) : !usersData?.users.length ? (
        <EmptyState
          title="Пользователи не найдены"
          description={search ? 'Попробуйте изменить поисковый запрос' : 'Пока нет пользователей'}
        />
      ) : (
        <div className="bg-tg-bg rounded-xl divide-y divide-tg-secondary-bg overflow-hidden">
          {usersData.users.map((user) => (
            <div key={user.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-tg-button text-tg-button-text flex items-center justify-center text-lg font-bold flex-shrink-0 overflow-hidden">
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt={user.firstName} className="w-full h-full object-cover" />
                  ) : (
                    user.firstName[0].toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-tg-text">
                      {user.firstName} {user.lastName}
                    </p>
                    {user.hasActiveSubscription && (
                      <Badge variant="success" size="sm">Подписка</Badge>
                    )}
                    {user.isAdmin && (
                      <Badge variant="info" size="sm">Админ</Badge>
                    )}
                  </div>
                  {user.username && (
                    <p className="text-sm text-tg-hint">@{user.username}</p>
                  )}
                  <p className="text-xs text-tg-hint mt-1">
                    Telegram ID: {user.telegramId}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-tg-secondary-bg text-sm">
                <div>
                  <span className="text-tg-hint">Регистрация: </span>
                  <span className="text-tg-text">{formatDate(user.createdAt)}</span>
                </div>
                <div>
                  <span className="text-tg-hint">Прослушиваний: </span>
                  <span className="text-tg-text">{formatNumber(user.playCount)}</span>
                </div>
                <div>
                  <span className="text-tg-hint">Покупок: </span>
                  <span className="text-tg-text">{user.purchaseCount}</span>
                </div>
                <div>
                  <span className="text-tg-hint">Потрачено: </span>
                  <span className="text-tg-text">{formatPrice(user.totalSpent)}</span>
                </div>
              </div>

              {/* Subscription info */}
              {user.subscriptionUntil && (
                <div className="mt-2 text-sm">
                  <span className="text-tg-hint">Подписка до: </span>
                  <span className={user.hasActiveSubscription ? 'text-green-600' : 'text-tg-destructive'}>
                    {formatDate(user.subscriptionUntil)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination info */}
      {usersData && (
        <div className="text-center text-sm text-tg-hint">
          Показано {usersData.users.length} из {usersData.pagination.total}
        </div>
      )}
    </div>
  )
}
