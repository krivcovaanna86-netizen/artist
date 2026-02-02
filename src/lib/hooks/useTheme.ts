import { useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'app-theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get from localStorage or default to 'system'
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored
      }
    }
    return 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Get system preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }, [])

  // Apply theme to document
  const applyTheme = useCallback((resolvedTheme: 'light' | 'dark') => {
    const root = document.documentElement

    if (resolvedTheme === 'dark') {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.setAttribute('data-theme', 'light')
    }

    // Also try to sync with Telegram theme if available
    const tgWebApp = window.Telegram?.WebApp
    if (tgWebApp) {
      try {
        // Set header color based on theme
        tgWebApp.setHeaderColor(resolvedTheme === 'dark' ? '#212121' : '#ffffff')
        tgWebApp.setBackgroundColor(resolvedTheme === 'dark' ? '#212121' : '#ffffff')
      } catch (e) {
        console.log('Could not sync Telegram theme:', e)
      }
    }
  }, [])

  // Resolve the actual theme
  const resolveTheme = useCallback((): 'light' | 'dark' => {
    // First, check Telegram WebApp theme
    const tgWebApp = window.Telegram?.WebApp
    if (tgWebApp?.colorScheme) {
      // If theme is 'system', follow Telegram's theme
      if (theme === 'system') {
        return tgWebApp.colorScheme as 'light' | 'dark'
      }
    }

    // Otherwise, use stored preference or system
    if (theme === 'system') {
      return getSystemTheme()
    }
    return theme
  }, [theme, getSystemTheme])

  // Set and persist theme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }, [])

  // Toggle between light/dark
  const toggleTheme = useCallback(() => {
    const newTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }, [resolvedTheme, setTheme])

  // Cycle through themes: light -> dark -> system -> light
  const cycleTheme = useCallback(() => {
    const next: Record<Theme, Theme> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    }
    setTheme(next[theme])
  }, [theme, setTheme])

  // Effect to resolve and apply theme
  useEffect(() => {
    const resolved = resolveTheme()
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [theme, resolveTheme, applyTheme])

  // Listen for system preference changes
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

  // Listen for Telegram theme changes
  useEffect(() => {
    const tgWebApp = window.Telegram?.WebApp
    if (!tgWebApp) return

    const handleTgThemeChange = () => {
      if (theme === 'system' && tgWebApp.colorScheme) {
        const resolved = tgWebApp.colorScheme as 'light' | 'dark'
        setResolvedTheme(resolved)
        applyTheme(resolved)
      }
    }

    // Check if Telegram Web App supports theme change event
    if (tgWebApp.onEvent) {
      tgWebApp.onEvent('themeChanged', handleTgThemeChange)
      return () => {
        tgWebApp.offEvent('themeChanged', handleTgThemeChange)
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

// For global access
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        colorScheme?: string
        setHeaderColor?: (color: string) => void
        setBackgroundColor?: (color: string) => void
        onEvent?: (event: string, callback: () => void) => void
        offEvent?: (event: string, callback: () => void) => void
        [key: string]: any
      }
    }
  }
}
