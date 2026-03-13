// src/App.tsx
import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { ToastProvider } from './components/ui'
import { useAuthStore } from './store'
import { authApi } from './services/api'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import RoomSelect from './pages/RoomSelect'
import RoomPage from './pages/Room'
import AuthCallback from './pages/AuthCallback'
import './styles/global.css'

// Protected route
function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const location = useLocation()
  if (!user) return <Navigate to={`/login?next=${location.pathname}`} replace />
  return <>{children}</>
}

// Auto-load user on startup
function AuthLoader({ children }: { children: React.ReactNode }) {
  const { user, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    if (!user) return
    setLoading(true)
    authApi.me().then(setUser).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return <>{children}</>
}

// Header visibility
function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isGame = location.pathname.match(/^\/room\/.+/) && !location.pathname.endsWith('/lobby')
  // Show header everywhere except inside active game
  return (
    <>
      <Header />
      {children}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthLoader>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Auth mode="login" />} />
              <Route path="/register" element={<Auth mode="register" />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/profile" element={<Protected><Profile /></Protected>} />
              <Route path="/room" element={<Protected><RoomSelect /></Protected>} />
              <Route path="/room/:code" element={<Protected><RoomPage /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </AuthLoader>
      </ToastProvider>
    </BrowserRouter>
  )
}
