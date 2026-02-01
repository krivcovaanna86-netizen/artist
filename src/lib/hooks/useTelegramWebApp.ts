import { useEffect, useState } from 'react'

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    query_id?: string
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
      is_premium?: boolean
      photo_url?: string
    }
    auth_date: number
    hash: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
    header_bg_color?: string
    accent_text_color?: string
    section_bg_color?: string
    section_header_text_color?: string
    subtitle_text_color?: string
    destructive_text_color?: string
  }
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  isClosingConfirmationEnabled: boolean
  BackButton: {
    isVisible: boolean
    show(): void
    hide(): void
    onClick(callback: () => void): void
    offClick(callback: () => void): void
  }
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    isProgressVisible: boolean
    setText(text: string): void
    onClick(callback: () => void): void
    offClick(callback: () => void): void
    show(): void
    hide(): void
    enable(): void
    disable(): void
    showProgress(leaveActive?: boolean): void
    hideProgress(): void
  }
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }
  ready(): void
  expand(): void
  close(): void
  setHeaderColor(color: 'bg_color' | 'secondary_bg_color' | string): void
  setBackgroundColor(color: 'bg_color' | 'secondary_bg_color' | string): void
  enableClosingConfirmation(): void
  disableClosingConfirmation(): void
  onEvent(eventType: string, callback: () => void): void
  offEvent(eventType: string, callback: () => void): void
  sendData(data: string): void
  openLink(url: string, options?: { try_instant_view?: boolean }): void
  openTelegramLink(url: string): void
  showPopup(params: {
    title?: string
    message: string
    buttons?: Array<{
      id?: string
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'
      text?: string
    }>
  }, callback?: (buttonId: string) => void): void
  showAlert(message: string, callback?: () => void): void
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void
}

export function useTelegramWebApp() {
  const [isReady, setIsReady] = useState(false)
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)

  useEffect(() => {
    const tg = window.Telegram?.WebApp

    if (tg) {
      tg.ready()
      setWebApp(tg)
      setIsReady(true)

      // Apply theme
      document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff')
      document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000')
      document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999')
      document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc')
      document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc')
      document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff')
      document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f0f0f0')
      document.documentElement.style.setProperty('--tg-theme-header-bg-color', tg.themeParams.header_bg_color || '#ffffff')
      document.documentElement.style.setProperty('--tg-theme-accent-text-color', tg.themeParams.accent_text_color || '#2481cc')
      document.documentElement.style.setProperty('--tg-theme-section-bg-color', tg.themeParams.section_bg_color || '#ffffff')
      document.documentElement.style.setProperty('--tg-theme-section-header-text-color', tg.themeParams.section_header_text_color || '#999999')
      document.documentElement.style.setProperty('--tg-theme-subtitle-text-color', tg.themeParams.subtitle_text_color || '#999999')
      document.documentElement.style.setProperty('--tg-theme-destructive-text-color', tg.themeParams.destructive_text_color || '#ff3b30')
    } else {
      // Development mode - no Telegram WebApp available
      console.warn('Telegram WebApp not available. Running in development mode.')
      setIsReady(true)
    }
  }, [])

  const getInitData = () => {
    return webApp?.initData || ''
  }

  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') => {
    if (!webApp?.HapticFeedback) return

    if (type === 'selection') {
      webApp.HapticFeedback.selectionChanged()
    } else if (['success', 'error', 'warning'].includes(type)) {
      webApp.HapticFeedback.notificationOccurred(type as 'success' | 'error' | 'warning')
    } else {
      webApp.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy')
    }
  }

  const showAlert = (message: string) => {
    if (webApp) {
      webApp.showAlert(message)
    } else {
      alert(message)
    }
  }

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (webApp) {
        webApp.showConfirm(message, resolve)
      } else {
        resolve(confirm(message))
      }
    })
  }

  const openLink = (url: string) => {
    if (webApp) {
      webApp.openLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  return {
    isReady,
    webApp,
    getInitData,
    hapticFeedback,
    showAlert,
    showConfirm,
    openLink,
    colorScheme: webApp?.colorScheme || 'light',
    platform: webApp?.platform || 'unknown',
    user: webApp?.initDataUnsafe.user,
  }
}
