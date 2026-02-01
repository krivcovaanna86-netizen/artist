import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminPayments } from '../../lib/api/admin'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatPrice, formatDateTime } from '../../lib/utils/format'

type PaymentType = 'all' | 'subscription' | 'track'
type PaymentStatus = 'all' | 'pending' | 'success' | 'failed' | 'refunded'

export default function AdminPaymentsPage() {
  const [typeFilter, setTypeFilter] = useState<PaymentType>('all')
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>('all')

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['admin', 'payments', typeFilter, statusFilter],
    queryFn: () =>
      getAdminPayments({
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      }),
  })

  const types: { value: PaymentType; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'subscription', label: 'Подписки' },
    { value: 'track', label: 'Треки' },
  ]

  const statuses: { value: PaymentStatus; label: string }[] = [
    { value: 'all', label: 'Все статусы' },
    { value: 'success', label: 'Успешные' },
    { value: 'pending', label: 'Ожидание' },
    { value: 'failed', label: 'Ошибка' },
    { value: 'refunded', label: 'Возврат' },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Успешно</Badge>
      case 'pending':
        return <Badge variant="warning">Ожидание</Badge>
      case 'failed':
        return <Badge variant="error">Ошибка</Badge>
      case 'refunded':
        return <Badge variant="info">Возврат</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {types.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                typeFilter === t.value
                  ? 'bg-tg-button text-tg-button-text'
                  : 'bg-tg-bg text-tg-text hover:bg-tg-secondary-bg'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s.value
                  ? 'bg-tg-button text-tg-button-text'
                  : 'bg-tg-bg text-tg-text hover:bg-tg-secondary-bg'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments List */}
      {isLoading ? (
        <div className="bg-tg-bg rounded-xl p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton width={48} height={48} className="rounded-lg" />
              <div className="flex-1">
                <Skeleton width="70%" height={18} className="mb-2" />
                <Skeleton width="50%" height={14} />
              </div>
              <Skeleton width={80} height={24} />
            </div>
          ))}
        </div>
      ) : !paymentsData?.payments.length ? (
        <EmptyState
          title="Платежи не найдены"
          description="Нет платежей по выбранным фильтрам"
        />
      ) : (
        <div className="bg-tg-bg rounded-xl divide-y divide-tg-secondary-bg overflow-hidden">
          {paymentsData.payments.map((payment) => (
            <div key={payment.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  payment.type === 'subscription' ? 'bg-purple-100' : 'bg-blue-100'
                }`}>
                  {payment.type === 'subscription' ? (
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-tg-text">
                      {payment.type === 'subscription' ? 'Подписка' : payment.track?.title || 'Трек'}
                    </p>
                    {getStatusBadge(payment.status)}
                  </div>
                  {payment.type === 'track' && payment.track && (
                    <p className="text-sm text-tg-hint">{payment.track.artist}</p>
                  )}
                  <p className="text-sm text-tg-hint mt-1">
                    {payment.user.firstName} {payment.user.lastName}
                    {payment.user.username && ` (@${payment.user.username})`}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className="font-medium text-tg-text">{formatPrice(payment.amount)}</p>
                  <p className="text-xs text-tg-hint">{formatDateTime(payment.createdAt)}</p>
                </div>
              </div>

              {/* Additional info */}
              {payment.providerPaymentId && (
                <div className="mt-2 text-xs text-tg-hint">
                  ID: {payment.providerPaymentId}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {paymentsData && (
        <div className="bg-tg-bg rounded-xl p-4">
          <div className="flex justify-between text-sm">
            <span className="text-tg-hint">Всего платежей:</span>
            <span className="text-tg-text">{paymentsData.pagination.total}</span>
          </div>
          {paymentsData.payments.length > 0 && (
            <div className="flex justify-between text-sm mt-2">
              <span className="text-tg-hint">Сумма на странице:</span>
              <span className="text-tg-text">
                {formatPrice(
                  paymentsData.payments
                    .filter((p) => p.status === 'success')
                    .reduce((sum, p) => sum + p.amount, 0)
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
