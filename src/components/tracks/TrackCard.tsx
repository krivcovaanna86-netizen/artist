import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type Track } from '../../lib/api/client'
import { usePlayerStore } from '../../stores/playerStore'
import { formatDuration, formatPrice } from '../../lib/utils/format'
import { useTelegramWebApp } from '../../lib/hooks/useTelegramWebApp'
import { LimitExceededModal } from '../ui/LimitExceededModal'

interface TrackCardProps {
  track: Track
  isPurchased?: boolean
  remainingPlays?: number
  variant?: 'list' | 'card'  // list for mobile, card for desktop grid
}

export function TrackCard({ track, isPurchased, remainingPlays, variant = 'list' }: TrackCardProps) {
  const navigate = useNavigate()
  const { hapticFeedback } = useTelegramWebApp()
  const { currentTrack, isPlaying, isLoading, loadTrack, toggle, playPermission } = usePlayerStore()
  const [showLimitModal, setShowLimitModal] = useState(false)

  const isCurrentTrack = currentTrack?.id === track.id
  const isCurrentPlaying = isCurrentTrack && isPlaying

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticFeedback('light')

    if (isCurrentTrack) {
      toggle()
    } else {
      const success = await loadTrack(track)
      if (success) {
        usePlayerStore.getState().play()
      } else {
        // Check if limit was exceeded
        const permission = usePlayerStore.getState().playPermission
        if (permission && permission.reason === 'limit_exceeded') {
          setShowLimitModal(true)
          hapticFeedback('error')
        }
      }
    }
  }

  const handleCardClick = () => {
    hapticFeedback('selection')
    navigate(`/track/${track.id}`)
  }

  const getStatusIndicator = () => {
    if (isPurchased) {
      return (
        <span className="text-xs text-green-600 font-medium">Куплен</span>
      )
    }
    if (remainingPlays !== undefined) {
      if (remainingPlays > 0) {
        return (
          <span className="text-xs text-tg-hint">
            Осталось: {remainingPlays}
          </span>
        )
      } else {
        return (
          <span className="text-xs text-tg-destructive">Лимит исчерпан</span>
        )
      }
    }
    return null
  }

  const PlayButton = () => (
    <button
      onClick={handlePlayClick}
      disabled={isLoading && isCurrentTrack}
      className={`flex-shrink-0 flex items-center justify-center rounded-full bg-tg-button text-tg-button-text transition-transform hover:scale-105 active:scale-95 ${
        variant === 'card' ? 'w-12 h-12' : 'w-10 h-10'
      }`}
    >
      {isLoading && isCurrentTrack ? (
        <svg className={`animate-spin ${variant === 'card' ? 'w-6 h-6' : 'w-5 h-5'}`} fill="none" viewBox="0 0 24 24">
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
      ) : isCurrentPlaying ? (
        <svg className={variant === 'card' ? 'w-6 h-6' : 'w-5 h-5'} fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      ) : (
        <svg className={`ml-0.5 ${variant === 'card' ? 'w-6 h-6' : 'w-5 h-5'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  )

  // Card variant for desktop grid
  if (variant === 'card') {
    return (
      <div
        className="group rounded-2xl bg-tg-section-bg hover:bg-tg-secondary-bg transition-all cursor-pointer overflow-hidden hover-card"
        onClick={handleCardClick}
      >
        {/* Cover - large, square */}
        <div className="relative aspect-square bg-tg-secondary-bg overflow-hidden">
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-4 right-4">
              <PlayButton />
            </div>
          </div>

          {/* Currently playing indicator */}
          {isCurrentTrack && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              {isCurrentPlaying && (
                <div className="flex gap-1">
                  <span className="w-1 h-6 bg-white rounded animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-8 bg-white rounded animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-6 bg-white rounded animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          )}

          {/* Status badge */}
          {isPurchased && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
              Куплен
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-tg-text truncate mb-1">{track.title}</h3>
          <p className="text-sm text-tg-hint truncate mb-2">{track.artist}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-tg-hint">{formatDuration(track.duration)}</span>
            {!isPurchased && track.price > 0 && (
              <span className="text-sm font-semibold text-tg-accent">
                {formatPrice(track.price)}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // List variant (default) for mobile
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-tg-section-bg hover:bg-tg-secondary-bg transition-colors cursor-pointer track-card"
      onClick={handleCardClick}
    >
      {/* Cover */}
      <div className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-tg-secondary-bg">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-6 h-6 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
        {isCurrentTrack && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            {isCurrentPlaying && (
              <div className="flex gap-0.5">
                <span className="w-0.5 h-3 bg-white rounded animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-0.5 h-4 bg-white rounded animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-0.5 h-3 bg-white rounded animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-tg-text truncate">{track.title}</p>
        <p className="text-xs text-tg-hint truncate">{track.artist}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-tg-hint">{formatDuration(track.duration)}</span>
          {getStatusIndicator()}
        </div>
      </div>

      {/* Price */}
      {!isPurchased && track.price > 0 && (
        <div className="text-xs font-medium text-tg-accent">
          {formatPrice(track.price)}
        </div>
      )}

      {/* Play button */}
      <PlayButton />

      {/* Limit exceeded modal */}
      <LimitExceededModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        trackTitle={track.title}
        trackArtist={track.artist}
      />
    </div>
  )
}
