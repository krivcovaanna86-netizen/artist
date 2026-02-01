import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTelegramWebApp } from './lib/hooks/useTelegramWebApp'
import { useAuthStore } from './stores/authStore'

// Layouts
import AppLayout from './components/layout/AppLayout'
import AdminLayout from './components/layout/AdminLayout'

// User Pages
import CatalogPage from './pages/app/CatalogPage'
import TrackPage from './pages/app/TrackPage'
import ProfilePage from './pages/app/ProfilePage'
import SubscriptionPage from './pages/app/SubscriptionPage'
import PaymentStatusPage from './pages/app/PaymentStatusPage'

// Admin Pages
import AdminDashboard from './pages/admin/DashboardPage'
import AdminTracks from './pages/admin/TracksPage'
import AdminCategories from './pages/admin/CategoriesPage'
import AdminUsers from './pages/admin/UsersPage'
import AdminPayments from './pages/admin/PaymentsPage'
import AdminSettings from './pages/admin/SettingsPage'

// Components
import { LoadingScreen } from './components/ui/LoadingScreen'
import { MiniPlayer } from './components/player/MiniPlayer'

function App() {
  const { isReady, webApp } = useTelegramWebApp()
  const { user, isLoading, fetchUser } = useAuthStore()

  useEffect(() => {
    if (isReady && webApp) {
      // Expand the app to full height
      webApp.expand()
      
      // Set header color
      webApp.setHeaderColor('secondary_bg_color')
      
      // Enable closing confirmation
      webApp.enableClosingConfirmation()

      // Fetch user data
      fetchUser()
    }
  }, [isReady, webApp, fetchUser])

  if (!isReady || isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-tg-bg text-tg-text">
      <Routes>
        {/* User Routes */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/track/:id" element={<TrackPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/payment/status" element={<PaymentStatusPage />} />
        </Route>

        {/* Admin Routes */}
        {user?.isAdmin && (
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="tracks" element={<AdminTracks />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        )}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Mini Player - always visible when track is playing */}
      <MiniPlayer />
    </div>
  )
}

export default App
