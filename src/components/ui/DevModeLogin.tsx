import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { Button } from './Button'
import { TelegramLogin } from './TelegramLogin'
import { useTheme } from '../../lib/hooks/useTheme'

export function DevModeLogin() {
  const { enableDevMode, fetchUser, isLoading } = useAuthStore()
  const { theme, cycleTheme } = useTheme()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [showDevOptions, setShowDevOptions] = useState(false)

  const handleDevLogin = async () => {
    setIsLoggingIn(true)
    enableDevMode()
    
    // Wait a bit for localStorage to update
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Try to fetch user again
    await fetchUser()
    setIsLoggingIn(false)
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return '☀️'
      case 'dark': return '🌙'
      default: return '🌓'
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Светлая'
      case 'dark': return 'Тёмная'
      default: return 'Системная'
    }
  }

  return (
    <div className="min-h-screen bg-tg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-tg-section-bg rounded-2xl p-6 shadow-lg">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4">
          <button
            onClick={cycleTheme}
            className="p-2 rounded-full bg-tg-secondary-bg hover:bg-tg-hint/20 transition-colors"
            title={`Тема: ${getThemeLabel()}`}
          >
            <span className="text-xl">{getThemeIcon()}</span>
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-tg-button rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-tg-button-text" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-tg-text mb-2">Music Streaming</h1>
          <p className="text-tg-hint">Telegram Mini App</p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Вход через браузер
              </p>
              <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
                Для полной функциональности откройте приложение через Telegram бота.
                Или войдите через Telegram Login Widget ниже.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Telegram Login Widget */}
          <div className="bg-tg-secondary-bg rounded-xl p-4">
            <h3 className="text-sm font-medium text-tg-text mb-4 text-center">
              Войти через Telegram
            </h3>
            <TelegramLogin />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-tg-hint/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-tg-section-bg text-tg-hint">или</span>
            </div>
          </div>

          {/* Dev Mode Toggle */}
          <div className="text-center">
            {!showDevOptions ? (
              <button
                onClick={() => setShowDevOptions(true)}
                className="text-sm text-tg-hint hover:text-tg-text transition-colors"
              >
                Показать опции разработчика →
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-tg-hint">
                  Режим разработчика (тестовый аккаунт с правами админа)
                </p>
                <Button
                  onClick={handleDevLogin}
                  loading={isLoggingIn || isLoading}
                  variant="secondary"
                  fullWidth
                >
                  🔧 Войти как разработчик
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tg-hint/20">
          <p className="text-xs text-tg-hint text-center">
            При входе через Telegram Login вы получите доступ к своему аккаунту.
            Режим разработчика предоставляет тестовый аккаунт с правами администратора.
          </p>
        </div>
      </div>
    </div>
  )
}
