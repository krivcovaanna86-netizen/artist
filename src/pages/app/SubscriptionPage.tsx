import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getUserSubscription, createPayment } from '../../lib/api/client'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { useTelegramWebApp } from '../../lib/hooks/useTelegramWebApp'
import { formatPrice, formatDate } from '../../lib/utils/format'

export default function SubscriptionPage() {
  const { hapticFeedback, showAlert } = useTelegramWebApp()
  const [isProcessing, setIsProcessing] = useState(false)
  const [enableAutoRenewal, setEnableAutoRenewal] = useState(true) // По умолчанию включено

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: getUserSubscription,
  })

  const handleSubscribe = async () => {
    hapticFeedback('medium')
    setIsProcessing(true)

    try {
      const payment = await createPayment('subscription', undefined, enableAutoRenewal)
      
      if (payment.paymentUrl) {
        window.location.href = payment.paymentUrl
      }
    } catch (error) {
      console.error('Payment error:', error)
      showAlert('Ошибка при создании платежа. Попробуйте позже.')
    } finally {
      setIsProcessing(false)
    }
  }

  const benefits = [
    {
      icon: '🎵',
      title: 'Безлимитное прослушивание',
      description: 'Слушайте все треки без ограничений',
    },
    {
      icon: '🔄',
      title: 'Без рекламы',
      description: 'Наслаждайтесь музыкой без прерываний',
    },
    {
      icon: '📱',
      title: 'На всех устройствах',
      description: 'Доступ с любого устройства через Telegram',
    },
    {
      icon: '⭐',
      title: 'Эксклюзивный контент',
      description: 'Ранний доступ к новым релизам',
    },
  ]

  return (
    <div className="min-h-screen bg-tg-secondary-bg">
      {/* Hero */}
      <div className="bg-gradient-to-b from-tg-button/20 to-tg-bg p-6 text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-tg-button rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-tg-button-text" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-tg-text mb-2">Премиум подписка</h1>
        <p className="text-tg-hint">Откройте полный доступ к музыке</p>
      </div>

      {/* Current status */}
      <div className="mx-4 -mt-2 bg-tg-bg rounded-2xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-tg-hint">Статус подписки</span>
          {isLoading ? (
            <Skeleton width={80} height={24} />
          ) : subscription?.isActive ? (
            <Badge variant="success">Активна</Badge>
          ) : (
            <Badge variant="default">Не активна</Badge>
          )}
        </div>
        {subscription?.isActive && subscription.expiresAt && (
          <p className="text-sm text-tg-hint mt-2">
            Действует до {formatDate(subscription.expiresAt)}
          </p>
        )}
      </div>

      {/* Benefits */}
      <div className="bg-tg-bg mx-4 rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-tg-secondary-bg">
          <h2 className="font-medium text-tg-text">Преимущества</h2>
        </div>
        <div className="divide-y divide-tg-secondary-bg">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3 p-4">
              <span className="text-2xl">{benefit.icon}</span>
              <div>
                <h3 className="font-medium text-tg-text">{benefit.title}</h3>
                <p className="text-sm text-tg-hint">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price and CTA */}
      <div className="bg-tg-bg mx-4 rounded-2xl p-6 mb-4">
        <div className="text-center mb-4">
          {isLoading ? (
            <Skeleton width={100} height={40} className="mx-auto" />
          ) : (
            <>
              <div className="text-3xl font-bold text-tg-text">
                {formatPrice(subscription?.price || 29900)}
              </div>
              <p className="text-tg-hint">в месяц</p>
            </>
          )}
        </div>

        {/* Auto-renewal toggle */}
        <div className="flex items-center justify-between p-3 bg-tg-secondary-bg rounded-xl mb-4">
          <div className="flex-1">
            <p className="font-medium text-tg-text text-sm">Автопродление</p>
            <p className="text-xs text-tg-hint">Карта будет сохранена для автоматического списания</p>
          </div>
          <button
            onClick={() => setEnableAutoRenewal(!enableAutoRenewal)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              enableAutoRenewal ? 'bg-green-500' : 'bg-tg-hint'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                enableAutoRenewal ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <Button
          fullWidth
          size="lg"
          onClick={handleSubscribe}
          loading={isProcessing}
          disabled={isLoading}
        >
          {subscription?.isActive ? 'Продлить подписку' : 'Оформить подписку'}
        </Button>

        <p className="text-xs text-tg-hint text-center mt-3">
          {enableAutoRenewal 
            ? 'Подписка будет автоматически продлеваться каждый месяц'
            : 'Подписка активируется сразу после оплаты'
          }
        </p>
      </div>

      {/* Subscription history */}
      {subscription?.history && subscription.history.length > 0 && (
        <div className="bg-tg-bg mx-4 rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-tg-secondary-bg">
            <h2 className="font-medium text-tg-text">История подписок</h2>
          </div>
          <div className="divide-y divide-tg-secondary-bg">
            {subscription.history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-tg-text">
                    {formatDate(item.startedAt)} — {formatDate(item.expiresAt)}
                  </p>
                </div>
                <span className="text-sm text-tg-hint">{formatPrice(item.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="bg-tg-bg mx-4 rounded-2xl overflow-hidden mb-20">
        <div className="px-4 py-3 border-b border-tg-secondary-bg">
          <h2 className="font-medium text-tg-text">Частые вопросы</h2>
        </div>
        <div className="divide-y divide-tg-secondary-bg">
          <details className="group">
            <summary className="flex items-center justify-between p-4 cursor-pointer">
              <span className="text-tg-text">Как отменить подписку?</span>
              <svg
                className="w-5 h-5 text-tg-hint transform group-open:rotate-180 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="px-4 pb-4 text-sm text-tg-hint">
              {enableAutoRenewal 
                ? 'Вы можете отключить автопродление в настройках профиля в любое время до окончания текущего периода.'
                : 'Подписка не продлевается автоматически. По истечении срока действия вам нужно будет оформить её заново.'
              }
            </p>
          </details>
          <details className="group">
            <summary className="flex items-center justify-between p-4 cursor-pointer">
              <span className="text-tg-text">Можно ли вернуть деньги?</span>
              <svg
                className="w-5 h-5 text-tg-hint transform group-open:rotate-180 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="px-4 pb-4 text-sm text-tg-hint">
              Возврат средств возможен в течение 3 дней после оплаты, если вы не использовали подписку. Обратитесь в поддержку.
            </p>
          </details>
        </div>
      </div>
    </div>
  )
}
