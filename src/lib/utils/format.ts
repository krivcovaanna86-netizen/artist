// Format duration in seconds to mm:ss
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Format price in kopecks to rubles
export function formatPrice(kopecks: number): string {
  const rubles = kopecks / 100
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rubles)
}

// Format date
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ru-RU', options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Format date with time
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return formatDate(d, { month: 'short', day: 'numeric' })
  } else if (days > 0) {
    return `${days} ${pluralize(days, 'день', 'дня', 'дней')} назад`
  } else if (hours > 0) {
    return `${hours} ${pluralize(hours, 'час', 'часа', 'часов')} назад`
  } else if (minutes > 0) {
    return `${minutes} ${pluralize(minutes, 'минуту', 'минуты', 'минут')} назад`
  } else {
    return 'только что'
  }
}

// Russian pluralization
export function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100

  if (mod100 >= 11 && mod100 <= 14) {
    return many
  }

  if (mod10 === 1) {
    return one
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return few
  }

  return many
}

// Format number with spaces
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n)
}

// Truncate string
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

// Generate slug from string
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
      const map: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
        'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      }
      return map[char] || char
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
