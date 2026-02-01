import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useTelegramWebApp } from '../../lib/hooks/useTelegramWebApp'

export default function AdminLayout() {
  const navigate = useNavigate()
  const { webApp } = useTelegramWebApp()

  useEffect(() => {
    if (webApp) {
      webApp.BackButton.show()
      webApp.BackButton.onClick(() => navigate('/'))
    }

    return () => {
      webApp?.BackButton.hide()
    }
  }, [webApp, navigate])

  const navItems = [
    { path: '/admin', label: 'Обзор', exact: true },
    { path: '/admin/tracks', label: 'Треки' },
    { path: '/admin/categories', label: 'Категории' },
    { path: '/admin/users', label: 'Пользователи' },
    { path: '/admin/payments', label: 'Платежи' },
    { path: '/admin/settings', label: 'Настройки' },
  ]

  return (
    <div className="min-h-screen bg-tg-secondary-bg">
      {/* Header */}
      <header className="bg-tg-bg sticky top-0 z-40 border-b border-tg-secondary-bg">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-tg-text">Админ-панель</h1>
        </div>

        {/* Tab navigation */}
        <nav className="flex overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-tg-button text-tg-button'
                    : 'border-transparent text-tg-hint hover:text-tg-text'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
