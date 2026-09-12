import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from './api'
import type { User } from './types'
import { SetupPage } from './pages/SetupPage'
import { LoginPage } from './pages/LoginPage'
import { RecoveryPage } from './pages/RecoveryPage'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { RolesPage } from './pages/RolesPage'
import { PermissionDemoPage } from './pages/PermissionDemoPage'
import { ImplementorPage } from './pages/ImplementorPage'
import { SchemaPage } from './pages/SchemaPage'
import { FormsPage } from './pages/FormsPage'
import { AppShell } from './components/AppShell'
import { can } from './types'

export function App() {
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()

  async function refresh() {
    setLoading(true)
    try {
      const status = await api<{ needsSetup: boolean }>('/api/setup/status')
      setNeedsSetup(status.needsSetup)
      if (status.needsSetup) {
        setUser(null)
        return
      }
      try {
        const me = await api<{ user: User }>('/api/auth/me')
        setUser(me.user)
      } catch {
        setUser(null)
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

  const authed = Boolean(user)

  return (
    <Routes>
      <Route
        path="/setup"
        element={
          needsSetup ? (
            <SetupPage
              onComplete={(newUser) => {
                setUser(newUser)
                setNeedsSetup(false)
                navigate('/')
              }}
            />
          ) : (
            <Navigate to={authed ? '/' : '/login'} replace />
          )
        }
      />
      <Route
        path="/login"
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : authed ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage
              onLogin={(loggedIn) => {
                setUser(loggedIn)
                navigate('/')
              }}
            />
          )
        }
      />
      <Route path="/recovery" element={needsSetup ? <Navigate to="/setup" replace /> : <RecoveryPage />} />
      <Route
        element={
          needsSetup ? (
            <Navigate to="/setup" replace />
          ) : authed && user ? (
            <AppShell user={user} onLogout={() => setUser(null)} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={user ? <DashboardPage user={user} /> : null} />
        <Route
          path="usuarios"
          element={user && can(user, 'configure') ? <UsersPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="roles"
          element={user && can(user, 'configure') ? <RolesPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="estructuras"
          element={user && can(user, 'configure') ? <SchemaPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="formularios"
          element={user && can(user, 'configure') ? <FormsPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="implementador"
          element={user?.hasImplementorAccess ? <ImplementorPage /> : <Navigate to="/" replace />}
        />
        <Route path="permisos" element={user ? <PermissionDemoPage user={user} /> : null} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
