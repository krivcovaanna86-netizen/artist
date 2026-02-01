import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTrack, checkCanPlay, createPayment, getUserPurchases } from '../../lib/api/client'
import { usePlayerStore } from '../../stores/playerStore'
import { useAuthStore } from '../../stores/authStore'
import { useTelegramWebApp } from '../../lib/hooks/useTelegramWebApp'
import { FullPlayer } from '../../components/player/FullPlayer'
import { Button } from '../../components/ui/Button'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { formatPrice, formatDuration, formatDate } from '../../lib/utils/format'

export default function TrackPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { webApp, hapticFeedback, showAlert } = useTelegramWebApp()
  const { user } = useAuthStore()
  const { currentTrack, loadTrack, play, playPermission } = usePlayerStore()
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Show back button
  useEffect(() => {
    if (webApp) {
      webApp.BackButton.show()
      webApp.BackButton.onClick(() => navigate(-1))
    }

    return () => {
      webApp?.BackButton.hide()
    }
  }, [webApp, navigate])

  // Fetch track
  const { data: track, isLoading, error } = useQuery({
    queryKey: ['track', id],
    queryFn: () => getTrack(id!),
    enabled: !!id,
  })

  // Fetch purchases
  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases'],
    queryFn: getUserPurchases,
    enabled: !!user,
  })

  // Check play permission
  const { data: canPlayResult } = useQuery({
    queryKey: ['canPlay', id],
    queryFn: () => checkCanPlay(id!),
    enabled: !!id && !!user,
  })

  const isPurchased = purchases.some((p) => p.track.id === id)
  const isCurrentTrack = currentTrack?.id === id

  // Load track when page opens
  useEffect(() => {
    if (track && !isCurrentTrack) {
      loadTrack(track)
    }
  }, [track, isCurrentTrack, loadTrack])

  const handleBuy = async () => {
    if (!track) return

    hapticFeedback('medium')
    setIsProcessingPayment(true)

    try {
      const payment = await createPayment('track', track.id)
      
      // Redirect to payment
      if (payment.paymentUrl) {
        window.location.href = payment.paymentUrl
      }
    } catch (error) {
      console.error('Payment error:', error)
      showAlert('Ошибка при создании платежа. Попробуйте позже.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handleDownload = () => {
    if (!track || !isPurchased) return
    
    hapticFeedback('success')
    // The stream URL can be used for download for purchased tracks
    // In a real app, you might want a separate download endpoint
    showAlert('Функция скачивания будет доступна в следующем обновлении')
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error || !track) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <svg className="w-16 h-16 text-tg-hint mb-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <h2 className="text-xl font-bold text-tg-text mb-2">Трек не найден</h2>
        <p className="text-tg-hint mb-4">Возможно, он был удалён</p>
        <Button onClick={() => navigate('/')}>Вернуться в каталог</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tg-bg">
      {/* Player */}
      {isCurrentTrack && (
        <FullPlayer
          onBuyClick={handleBuy}
          canPurchase={track.price > 0}
          isPurchased={isPurchased}
        />
      )}

      {/* Track info when not current */}
      {!isCurrentTrack && (
        <div className="p-6">
          {/* Cover */}
          <div className="w-64 h-64 mx-auto rounded-2xl overflow-hidden bg-tg-secondary-bg shadow-lg mb-6">
            {track.coverUrl ? (
              <img
                src={track.coverUrl}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-24 h-24 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-tg-text mb-1">{track.title}</h1>
            <p className="text-tg-hint text-lg">{track.artist}</p>
          </div>

          {/* Play button */}
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              loadTrack(track)
              play()
            }}
            className="mb-4"
          >
            Воспроизвести
          </Button>
        </div>
      )}

      {/* Additional info */}
      <div className="p-6 bg-tg-section-bg rounded-t-3xl">
        <h3 className="text-sm font-medium text-tg-section-header mb-4">Информация</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-tg-hint">Длительность</span>
            <span className="text-tg-text">{formatDuration(track.duration)}</span>
          </div>
          
          {track.categories.length > 0 && (
            <div className="flex justify-between">
              <span className="text-tg-hint">Категория</span>
              <span className="text-tg-text">
                {track.categories.map((c) => c.name).join(', ')}
              </span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-tg-hint">Прослушиваний</span>
            <span className="text-tg-text">{track.playCount}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-tg-hint">Добавлен</span>
            <span className="text-tg-text">{formatDate(track.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {!isPurchased && track.price > 0 && (
            <Button
              fullWidth
              onClick={handleBuy}
              loading={isProcessingPayment}
            >
              Купить за {formatPrice(track.price)}
            </Button>
          )}

          {isPurchased && (
            <Button
              fullWidth
              variant="secondary"
              onClick={handleDownload}
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              Скачать
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
