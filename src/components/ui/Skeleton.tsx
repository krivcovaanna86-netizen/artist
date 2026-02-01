interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const baseStyles = 'skeleton'

  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%'),
  }

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      style={style}
    />
  )
}

export function TrackSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton variant="rectangular" width={56} height={56} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton variant="text" width="70%" height={18} className="mb-2" />
        <Skeleton variant="text" width="50%" height={14} />
      </div>
      <Skeleton variant="circular" width={40} height={40} />
    </div>
  )
}

export function TrackListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <TrackSkeleton key={i} />
      ))}
    </div>
  )
}
