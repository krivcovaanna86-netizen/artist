import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPaymentStatus } from '../../lib/api/client'
import { Button } from '../../components/ui/Button'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { formatPrice } from '../../lib/utils/format'

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const paymentId = searchParams.get('id')
  const [pollCount, setPollCount] = useState(0)

  const { data: payment, isLoading, error, refetch } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => getPaymentStatus(paymentId!),
    enabled: !!paymentId,
    refetchInterval: (query) => {
      // Poll every 2 seconds while pending, up to 30 times (1 minute)
      const data = query.state.data
      if (data?.status === 'pending' && pollCount < 30) {
        return 2000
      }
      return false
    },
  })

  // Increment poll count
  useEffect(() => {
    if (payment?.status === 'pending') {
      setPollCount((c) => c + 1)
    }
  }, [payment])

  if (!paymentId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <svg className="w-16 h-16 text-tg-hint mb-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <h1 className="text-xl font-bold text-tg-text mb-2">Платёж не найден</h1>
        <p className="text-tg-hint mb-6 text-center">Идентификатор платежа не указан</p>
        <Button onClick={() => navigate('/')}>Вернуться в каталог</Button>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <svg className="w-16 h-16 text-tg-destructive mb-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <h1 className="text-xl font-bold text-tg-text mb-2">Ошибка</h1>
        <p className="text-tg-hint mb-6 text-center">Не удалось получить статус платежа</p>
        <Button onClick={() => refetch()}>Повторить</Button>
      </div>
    )
  }

  const renderContent = () => {
    switch (payment.status) {
      case 'success':
        return (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-tg-text mb-2">Оплата успешна!</h1>
            <p className="text-tg-hint mb-2">
              {payment.type === 'subscription'
                ? 'Подписка активирована'
                : `Трек "${payment.track?.title}" добавлен в вашу библиотеку`}
            </p>
            <p className="text-tg-hint mb-6">Сумма: {formatPrice(payment.amount)}</p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {payment.type === 'track' && payment.track && (
                <Button onClick={() => navigate(`/track/${payment.track!.id}`)}>
                  Слушать трек
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/')}>
                В каталог
              </Button>
            </div>
          </>
        )

      case 'failed':
        return (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-tg-text mb-2">Оплата не прошла</h1>
            <p className="text-tg-hint mb-6 text-center">
              К сожалению, платёж не был обработан. Попробуйте ещё раз или используйте другой способ оплаты.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button onClick={() => navigate(-1)}>Попробовать снова</Button>
              <Button variant="secondary" onClick={() => navigate('/')}>
                В каталог
              </Button>
            </div>
          </>
        )

      case 'pending':
        return (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-tg-text mb-2">Обработка платежа...</h1>
            <p className="text-tg-hint mb-6 text-center">
              Пожалуйста, подождите. Это может занять некоторое время.
            </p>
            {pollCount >= 30 && (
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button onClick={() => refetch()}>Проверить статус</Button>
                <Button variant="secondary" onClick={() => navigate('/')}>
                  В каталог
                </Button>
              </div>
            )}
          </>
        )

      case 'refunded':
        return (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-tg-text mb-2">Платёж возвращён</h1>
            <p className="text-tg-hint mb-6 text-center">
              Средства будут возвращены на ваш счёт в течение нескольких дней.
            </p>
            <Button onClick={() => navigate('/')}>В каталог</Button>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {renderContent()}
    </div>
  )
}
