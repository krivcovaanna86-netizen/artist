import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

const BOT_USERNAME = 'artist_wth_bot'

export function TelegramLogin() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const { setTelegramAuthUser, fetchUser, isLoading } = useAuthStore()

  useEffect(() => {
    ;(window as any).onTelegramAuth = async (user: TelegramUser) => {
      console.log('[TelegramLogin] Auth callback received:', user)
      try {
        const authData = JSON.stringify(user)
        localStorage.setItem('telegram_auth', authData)
        setTelegramAuthUser(user)
        await fetchUser()
      } catch (err) {
        console.error('[TelegramLogin] Auth error:', err)
        setError('Ошибка авторизации')
      }
    }

    if (containerRef.current) {
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.setAttribute('data-telegram-login', BOT_USERNAME)
      script.setAttribute('data-size', 'large')
      script.setAttribute('data-onauth', 'onTelegramAuth(user)')
      script.setAttribute('data-request-access', 'write')
      script.async = true
      
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(script)
    }

    return () => {
      delete (window as any).onTelegramAuth
    }
  }, [setTelegramAuthUser, fetchUser])

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={containerRef} className="min-h-[40px]" />

      {error && (
        <div className="text-red-500 text-sm text-center">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-tg-hint">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span>Авторизация...</span>
        </div>
      )}

      <div className="text-center">
        <p className="text-xs text-tg-hint mb-2">
          Или откройте бота напрямую:
        </p>
        <a
          href={`https://t.me/${BOT_USERNAME}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0088cc] text-white rounded-xl hover:bg-[#0077b5] transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295l.213-3.054 5.56-5.022c.242-.213-.054-.333-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.828.94z"/>
          </svg>
          Открыть @{BOT_USERNAME}
        </a>
      </div>
    </div>
  )
}
