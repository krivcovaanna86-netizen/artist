import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminUsers, updateUser } from '../../lib/api/admin'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { formatPrice, formatNumber, formatDate } from '../../lib/utils/format'

type UserFilter = 'all' | 'subscribed' | 'unsubscribed' | 'purchased' | 'admins'

interface UserToEdit {
  id: string
  firstName: string
  lastName: string | null
  username: string | null
  isAdmin: boolean
  subscriptionUntil: string | null
  hasActiveSubscription: boolean
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<UserFilter>('all')
  const [editingUser, setEditingUser] = useState<UserToEdit | null>(null)
  const [editForm, setEditForm] = useState<{
    isAdmin: boolean
    subscriptionDays: string
  }>({ isAdmin: false, subscriptionDays: '' })
  
  const queryClient = useQueryClient()

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, filter],
    queryFn: () =>
      getAdminUsers({
        search: search || undefined,
        filter: filter === 'all' || filter === 'admins' ? undefined : filter,
        limit: 50,
      }),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; isAdmin?: boolean; subscriptionUntil?: string | null }) =>
      updateUser(data.id, { isAdmin: data.isAdmin, subscriptionUntil: data.subscriptionUntil }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setEditingUser(null)
    },
  })

  // Filter admins locally if needed
  const filteredUsers = usersData?.users.filter(user => {
    if (filter === 'admins') return user.isAdmin
    return true
  }) || []

  const filters: { value: UserFilter; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'admins', label: 'Админы' },
    { value: 'subscribed', label: 'С подпиской' },
    { value: 'unsubscribed', label: 'Без подписки' },
    { value: 'purchased', label: 'Покупавшие' },
  ]

  const handleEditUser = (user: any) => {
    setEditingUser({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      isAdmin: user.isAdmin,
      subscriptionUntil: user.subscriptionUntil,
      hasActiveSubscription: user.hasActiveSubscription,
    })
    setEditForm({
      isAdmin: user.isAdmin,
      subscriptionDays: '',
    })
  }

  const handleSaveUser = () => {
    if (!editingUser) return

    let subscriptionUntil: string | null | undefined = undefined
    
    if (editForm.subscriptionDays) {
      const days = parseInt(editForm.subscriptionDays, 10)
      if (!isNaN(days) && days > 0) {
        const now = new Date()
        // If user already has subscription, extend from that date
        const startDate = editingUser.hasActiveSubscription && editingUser.subscriptionUntil
          ? new Date(editingUser.subscriptionUntil)
          : now
        const newDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000)
        subscriptionUntil = newDate.toISOString()
      } else if (editForm.subscriptionDays === '0') {
        // Remove subscription
        subscriptionUntil = null
      }
    }

    updateMutation.mutate({
      id: editingUser.id,
      isAdmin: editForm.isAdmin,
      subscriptionUntil,
    })
  }

  const toggleAdmin = (user: any) => {
    updateMutation.mutate({
      id: user.id,
      isAdmin: !user.isAdmin,
    })
  }

  const grantSubscription = (user: any, days: number) => {
    const now = new Date()
    const startDate = user.hasActiveSubscription && user.subscriptionUntil
      ? new Date(user.subscriptionUntil)
      : now
    const newDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000)
    
    updateMutation.mutate({
      id: user.id,
      subscriptionUntil: newDate.toISOString(),
    })
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        placeholder="Поиск по имени или username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
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
      ) : !filteredUsers.length ? (
        <EmptyState
          title="Пользователи не найдены"
          description={search ? 'Попробуйте изменить поисковый запрос' : 'Пока нет пользователей'}
        />
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-tg-bg rounded-xl p-4">
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
                    ID: {user.telegramId}
                  </p>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => handleEditUser(user)}
                  className="p-2 text-tg-hint hover:text-tg-text hover:bg-tg-secondary-bg rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-tg-secondary-bg text-sm">
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

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-tg-secondary-bg">
                <Button
                  size="sm"
                  variant={user.isAdmin ? 'secondary' : 'primary'}
                  onClick={() => toggleAdmin(user)}
                  loading={updateMutation.isPending}
                >
                  {user.isAdmin ? 'Снять админа' : 'Сделать админом'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => grantSubscription(user, 30)}
                  loading={updateMutation.isPending}
                >
                  +30 дней
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => grantSubscription(user, 365)}
                  loading={updateMutation.isPending}
                >
                  +1 год
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination info */}
      {usersData && (
        <div className="text-center text-sm text-tg-hint">
          Показано {filteredUsers.length} из {usersData.pagination.total}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Редактировать: ${editingUser?.firstName || ''} ${editingUser?.lastName || ''}`}
      >
        <div className="space-y-4">
          {/* Admin toggle */}
          <div className="flex items-center justify-between p-4 bg-tg-secondary-bg rounded-xl">
            <div>
              <p className="font-medium text-tg-text">Права администратора</p>
              <p className="text-sm text-tg-hint">Доступ к админ-панели</p>
            </div>
            <button
              onClick={() => setEditForm(f => ({ ...f, isAdmin: !f.isAdmin }))}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                editForm.isAdmin ? 'bg-green-500' : 'bg-tg-hint'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  editForm.isAdmin ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Subscription */}
          <div className="p-4 bg-tg-secondary-bg rounded-xl space-y-3">
            <div>
              <p className="font-medium text-tg-text">Подписка</p>
              {editingUser?.hasActiveSubscription ? (
                <p className="text-sm text-green-600">
                  Активна до {formatDate(editingUser.subscriptionUntil!)}
                </p>
              ) : (
                <p className="text-sm text-tg-hint">Нет активной подписки</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-tg-hint mb-1">
                Добавить дней (0 = отменить подписку)
              </label>
              <Input
                type="number"
                placeholder="Количество дней"
                value={editForm.subscriptionDays}
                onChange={(e) => setEditForm(f => ({ ...f, subscriptionDays: e.target.value }))}
                min={0}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditForm(f => ({ ...f, subscriptionDays: '7' }))}>
                +7
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditForm(f => ({ ...f, subscriptionDays: '30' }))}>
                +30
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditForm(f => ({ ...f, subscriptionDays: '90' }))}>
                +90
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditForm(f => ({ ...f, subscriptionDays: '365' }))}>
                +365
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              fullWidth
              variant="secondary"
              onClick={() => setEditingUser(null)}
            >
              Отмена
            </Button>
            <Button
              fullWidth
              onClick={handleSaveUser}
              loading={updateMutation.isPending}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
