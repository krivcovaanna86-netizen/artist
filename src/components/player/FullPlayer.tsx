import { usePlayerStore } from '../../stores/playerStore'
import { formatDuration } from '../../lib/utils/format'

interface FullPlayerProps {
  onBuyClick?: () => void
  canPurchase?: boolean
  isPurchased?: boolean
}

export function FullPlayer({ onBuyClick, canPurchase, isPurchased }: FullPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    playPermission,
    toggle,
    seek,
    setVolume,
  } = usePlayerStore()

  if (!currentTrack) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    seek(time)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
  }

  const getStatusBadge = () => {
    if (isPurchased) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          Куплен
        </span>
      )
    }
    if (playPermission?.reason === 'subscription') {
      return (
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          Подписка
        </span>
      )
    }
    if (playPermission?.reason === 'free_limit' && playPermission.remainingPlays !== undefined) {
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
          Осталось: {playPermission.remainingPlays}
        </span>
      )
    }
    if (playPermission?.reason === 'limit_exceeded') {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
          Лимит исчерпан
        </span>
      )
    }
    return null
  }

  return (
    <div className="flex flex-col items-center p-6">
      {/* Cover */}
      <div className="w-64 h-64 rounded-2xl overflow-hidden bg-tg-secondary-bg shadow-lg mb-6">
        {currentTrack.coverUrl ? (
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
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
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-tg-text mb-1">{currentTrack.title}</h2>
        <p className="text-tg-hint">{currentTrack.artist}</p>
      </div>

      {/* Status badge */}
      <div className="mb-6">{getStatusBadge()}</div>

      {/* Progress */}
      <div className="w-full mb-4">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2"
        />
        <div className="flex justify-between text-xs text-tg-hint mt-1 tabular-nums">
          <span>{formatDuration(Math.floor(currentTime))}</span>
          <span>{formatDuration(Math.floor(duration))}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {/* Rewind 15s */}
        <button
          onClick={() => seek(Math.max(0, currentTime - 15))}
          className="p-2 text-tg-text hover:opacity-70 transition-opacity"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={toggle}
          disabled={isLoading || !playPermission?.canPlay}
          className="w-16 h-16 flex items-center justify-center rounded-full bg-tg-button text-tg-button-text disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
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
          ) : isPlaying ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Forward 15s */}
        <button
          onClick={() => seek(Math.min(duration, currentTime + 15))}
          className="p-2 text-tg-text hover:opacity-70 transition-opacity"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
          </svg>
        </button>
      </div>

      {/* Volume */}
      <div className="w-full flex items-center gap-3 px-4">
        <svg className="w-5 h-5 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-2"
        />
        <svg className="w-5 h-5 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      </div>

      {/* Buy button */}
      {canPurchase && !isPurchased && (
        <button
          onClick={onBuyClick}
          className="mt-6 w-full py-3 bg-tg-button text-tg-button-text rounded-xl font-medium"
        >
          Купить трек
        </button>
      )}
    </div>
  )
}
