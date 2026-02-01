import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../../stores/playerStore'
import { formatDuration } from '../../lib/utils/format'

export function MiniPlayer() {
  const navigate = useNavigate()
  const { currentTrack, isPlaying, isLoading, currentTime, duration, toggle } = usePlayerStore()

  if (!currentTrack) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-tg-section-bg border-t border-tg-secondary-bg safe-bottom z-40">
      {/* Progress bar */}
      <div className="h-1 bg-tg-secondary-bg">
        <div
          className="h-full bg-tg-button transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 p-3">
        {/* Cover */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-tg-secondary-bg cursor-pointer"
          onClick={() => navigate(`/track/${currentTrack.id}`)}
        >
          {currentTrack.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-6 h-6 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => navigate(`/track/${currentTrack.id}`)}
        >
          <p className="text-sm font-medium text-tg-text truncate">
            {currentTrack.title}
          </p>
          <p className="text-xs text-tg-hint truncate">
            {currentTrack.artist}
          </p>
        </div>

        {/* Time */}
        <div className="text-xs text-tg-hint tabular-nums">
          {formatDuration(Math.floor(currentTime))} / {formatDuration(duration)}
        </div>

        {/* Play/Pause */}
        <button
          onClick={toggle}
          disabled={isLoading}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-tg-button text-tg-button-text"
        >
          {isLoading ? (
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
          ) : isPlaying ? (
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
    </div>
  )
}
