import { useNavigate } from 'react-router-dom'
import { type Track } from '../../lib/api/client'
import { usePlayerStore } from '../../stores/playerStore'
import { formatDuration, formatPrice } from '../../lib/utils/format'
import { useTelegramWebApp } from '../../lib/hooks/useTelegramWebApp'

interface TrackCardProps {
  track: Track
  isPurchased?: boolean
  remainingPlays?: number
}

export function TrackCard({ track, isPurchased, remainingPlays }: TrackCardProps) {
  const navigate = useNavigate()
  const { hapticFeedback } = useTelegramWebApp()
  const { currentTrack, isPlaying, isLoading, loadTrack, toggle } = usePlayerStore()

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

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-tg-section-bg hover:bg-tg-secondary-bg transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Cover */}
      <div className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-tg-secondary-bg">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-full h-full object-cover"
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
      <button
        onClick={handlePlayClick}
        disabled={isLoading && isCurrentTrack}
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-tg-button text-tg-button-text"
      >
        {isLoading && isCurrentTrack ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  )
}
