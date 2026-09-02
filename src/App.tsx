import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from './api'
import type { Owner } from './types'
import { SetupPage } from './pages/SetupPage'
import { LoginPage } from './pages/LoginPage'
import { RecoveryPage } from './pages/RecoveryPage'
import { DashboardPage } from './pages/DashboardPage'

export function App() {
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [owner, setOwner] = useState<Owner | null>(null)
  const navigate = useNavigate()

  async function refresh() {
    setLoading(true)
    try {
      const status = await api<{ needsSetup: boolean }>('/api/setup/status')
      setNeedsSetup(status.needsSetup)
      if (status.needsSetup) {
        setOwner(null)
        return
      }
      try {
        const me = await api<{ owner: Owner }>('/api/auth/me')
        setOwner(me.owner)
      } catch {
        setOwner(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  if (loading) {
    return (
      <div className="shell center">
        <p className="muted">Cargando Qualitra…</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/setup"
        element={
          needsSetup ? (
            <SetupPage
              onComplete={(newOwner) => {
                setOwner(newOwner)
                setNeedsSetup(false)
                navigate('/')
              }}
            />
          ) : (
            <Navigate to={owner ? '/' : '/login'} replace />
          )
        }
      />
      <Route
        path="/login"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : owner ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage
              onLogin={(loggedIn) => {
                setOwner(loggedIn)
                navigate('/')
              }}
            />
          )
        }
      />
      <Route
        path="/recovery"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : (
            <RecoveryPage />
          )
        }
      />
      <Route
        path="/"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : owner ? (
            <DashboardPage
              owner={owner}
              onLogout={() => {
                setOwner(null)
                navigate('/login')
              }}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
