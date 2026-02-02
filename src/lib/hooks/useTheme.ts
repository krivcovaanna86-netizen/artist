import { useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'app-theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored
      }
    }
    return 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }, [])

  const applyTheme = useCallback((resolvedTheme: 'light' | 'dark') => {
    const root = document.documentElement

    if (resolvedTheme === 'dark') {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.setAttribute('data-theme', 'light')
    }

    const tgWebApp = (window as any).Telegram?.WebApp
    if (tgWebApp) {
      try {
        tgWebApp.setHeaderColor?.(resolvedTheme === 'dark' ? '#212121' : '#ffffff')
        tgWebApp.setBackgroundColor?.(resolvedTheme === 'dark' ? '#212121' : '#ffffff')
      } catch (e) {
        console.log('Could not sync Telegram theme:', e)
      }
    }
  }, [])

  const resolveTheme = useCallback((): 'light' | 'dark' => {
    const tgWebApp = (window as any).Telegram?.WebApp
    if (tgWebApp?.colorScheme) {
      if (theme === 'system') {
        return tgWebApp.colorScheme as 'light' | 'dark'
      }
    }

    if (theme === 'system') {
      return getSystemTheme()
    }
    return theme
  }, [theme, getSystemTheme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }, [resolvedTheme, setTheme])

  const cycleTheme = useCallback(() => {
    const next: Record<Theme, Theme> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    }
    setTheme(next[theme])
  }, [theme, setTheme])

  useEffect(() => {
    const resolved = resolveTheme()
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [theme, resolveTheme, applyTheme])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      if (theme === 'system') {
        const resolved = getSystemTheme()
        setResolvedTheme(resolved)
        applyTheme(resolved)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, getSystemTheme, applyTheme])

  useEffect(() => {
    const tgWebApp = (window as any).Telegram?.WebApp
    if (!tgWebApp) return

    const handleTgThemeChange = () => {
      if (theme === 'system' && tgWebApp.colorScheme) {
        const resolved = tgWebApp.colorScheme as 'light' | 'dark'
        setResolvedTheme(resolved)
        applyTheme(resolved)
      }
    }

    if (tgWebApp.onEvent) {
      tgWebApp.onEvent('themeChanged', handleTgThemeChange)
      return () => {
        tgWebApp.offEvent?.('themeChanged', handleTgThemeChange)
      }
    }
  }, [theme, applyTheme])

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    cycleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
  }
}
