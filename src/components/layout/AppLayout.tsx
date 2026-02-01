import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { usePlayerStore } from '../../stores/playerStore'

export default function AppLayout() {
  const location = useLocation()
  const { user } = useAuthStore()
  const { currentTrack } = usePlayerStore()

  const navItems = [
    {
      path: '/',
      label: 'Каталог',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      ),
    },
    {
      path: '/subscription',
      label: 'Подписка',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ),
    },
    {
      path: '/profile',
      label: 'Профиль',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      ),
    },
  ]

  // Add admin link for admins
  if (user?.isAdmin) {
    navItems.push({
      path: '/admin',
      label: 'Админ',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      ),
    })
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main content */}
      <main className={`flex-1 ${currentTrack ? 'pb-24' : 'pb-20'}`}>
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-tg-section-bg border-t border-tg-secondary-bg safe-bottom z-30"
           style={{ bottom: currentTrack ? '72px' : '0' }}>
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full transition-colors ${
                  isActive ? 'text-tg-button' : 'text-tg-hint'
                }`
              }
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
