import { useState, useEffect, useCallback, useRef } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'app-theme'

// Light theme colors
const lightTheme: Record<string, string> = {
  '--tg-theme-bg-color': '#ffffff',
  '--tg-theme-text-color': '#000000',
  '--tg-theme-hint-color': '#999999',
  '--tg-theme-link-color': '#2481cc',
  '--tg-theme-button-color': '#2481cc',
  '--tg-theme-button-text-color': '#ffffff',
  '--tg-theme-secondary-bg-color': '#f0f0f0',
  '--tg-theme-header-bg-color': '#ffffff',
  '--tg-theme-accent-text-color': '#2481cc',
  '--tg-theme-section-bg-color': '#ffffff',
  '--tg-theme-section-header-text-color': '#999999',
  '--tg-theme-subtitle-text-color': '#999999',
  '--tg-theme-destructive-text-color': '#ff3b30',
}

// Dark theme colors
const darkTheme: Record<string, string> = {
  '--tg-theme-bg-color': '#212121',
  '--tg-theme-text-color': '#ffffff',
  '--tg-theme-hint-color': '#aaaaaa',
  '--tg-theme-link-color': '#64b5f6',
  '--tg-theme-button-color': '#5288c1',
  '--tg-theme-button-text-color': '#ffffff',
  '--tg-theme-secondary-bg-color': '#0d0d0d',
  '--tg-theme-header-bg-color': '#212121',
  '--tg-theme-accent-text-color': '#64b5f6',
  '--tg-theme-section-bg-color': '#181818',
  '--tg-theme-section-header-text-color': '#aaaaaa',
  '--tg-theme-subtitle-text-color': '#aaaaaa',
  '--tg-theme-destructive-text-color': '#ff6b6b',
}

// Apply theme immediately (can be called outside of React)
function applyThemeToDOM(resolvedTheme: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  
  const root = document.documentElement
  const themeColors = resolvedTheme === 'dark' ? darkTheme : lightTheme

  // Set data-theme attribute for CSS selectors
  root.setAttribute('data-theme', resolvedTheme)

  // Apply all CSS variables directly to root element with !important via style
  Object.entries(themeColors).forEach(([property, value]) => {
    root.style.setProperty(property, value, 'important')
  })

  // Also update body background immediately for visual feedback
  if (document.body) {
    document.body.style.backgroundColor = themeColors['--tg-theme-bg-color']
    document.body.style.color = themeColors['--tg-theme-text-color']
  }
}

// Get initial theme from storage/system (can be called outside of React)
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

// Resolve theme to light/dark (can be called outside of React)
function resolveThemeValue(theme: Theme): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  
  // First check Telegram WebApp colorScheme if in system mode
  const tgWebApp = (window as any).Telegram?.WebApp
  if (tgWebApp?.colorScheme && theme === 'system') {
    return tgWebApp.colorScheme as 'light' | 'dark'
  }

  // If manual theme is set, use it
  if (theme !== 'system') {
    return theme
  }

  // Fall back to system preference
  if (window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  
  return 'light'
}

// Apply initial theme IMMEDIATELY when this module loads
// This prevents flash of wrong theme
if (typeof window !== 'undefined') {
  const initialTheme = getInitialTheme()
  const resolved = resolveThemeValue(initialTheme)
  applyThemeToDOM(resolved)
  console.log('[Theme] Initial theme applied on module load:', resolved)
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveThemeValue(getInitialTheme()))
  const isInitialMount = useRef(true)

  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }, [])

  // Apply theme by setting CSS variables directly on document root
  const applyTheme = useCallback((resolved: 'light' | 'dark') => {
    console.log('[Theme] Applying theme:', resolved)
    applyThemeToDOM(resolved)

    // Try to sync with Telegram WebApp if available
    const tgWebApp = (window as any).Telegram?.WebApp
    if (tgWebApp) {
      try {
        const themeColors = resolved === 'dark' ? darkTheme : lightTheme
        const headerColor = themeColors['--tg-theme-header-bg-color']
        const bgColor = themeColors['--tg-theme-bg-color']
        tgWebApp.setHeaderColor?.(headerColor)
        tgWebApp.setBackgroundColor?.(bgColor)
        console.log('[Theme] Synced with Telegram WebApp')
      } catch (e) {
        console.log('[Theme] Could not sync with Telegram:', e)
      }
    }

    console.log('[Theme] Theme applied successfully')
  }, [])

  const resolveTheme = useCallback((): 'light' | 'dark' => {
    return resolveThemeValue(theme)
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    console.log('[Theme] Setting theme to:', newTheme)
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    
    // Apply immediately
    const resolved = resolveThemeValue(newTheme)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [applyTheme])

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

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const resolved = resolveTheme()
    setResolvedTheme(resolved)
    
    // Always apply on mount to ensure theme is correct after navigation
    applyTheme(resolved)
    
    if (isInitialMount.current) {
      isInitialMount.current = false
    }
  }, [theme, resolveTheme, applyTheme])

  // Re-apply theme when window gains focus (handles tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Theme] Page became visible, re-applying theme')
        const resolved = resolveTheme()
        applyTheme(resolved)
      }
    }

    const handleFocus = () => {
      console.log('[Theme] Window focused, re-applying theme')
      const resolved = resolveTheme()
      applyTheme(resolved)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [resolveTheme, applyTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      console.log('[Theme] System theme changed to:', e.matches ? 'dark' : 'light')
      if (theme === 'system') {
        const resolved = e.matches ? 'dark' : 'light'
        setResolvedTheme(resolved)
        applyTheme(resolved)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, applyTheme])

  // Listen for Telegram theme changes
  useEffect(() => {
    const tgWebApp = (window as any).Telegram?.WebApp
    if (!tgWebApp?.onEvent) return

    const handleTgThemeChange = () => {
      console.log('[Theme] Telegram theme changed to:', tgWebApp.colorScheme)
      if (theme === 'system' && tgWebApp.colorScheme) {
        const resolved = tgWebApp.colorScheme as 'light' | 'dark'
        setResolvedTheme(resolved)
        applyTheme(resolved)
      }
    }

    tgWebApp.onEvent('themeChanged', handleTgThemeChange)
    return () => {
      tgWebApp.offEvent?.('themeChanged', handleTgThemeChange)
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
