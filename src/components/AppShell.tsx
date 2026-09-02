import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { CompanySettings, User } from '../types'
import { can, companyInitials } from '../types'

type Props = {
  user: User
  onLogout: () => void
}

export function AppShell({ user, onLogout }: Props) {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!can(user, 'view')) return
    api<{ settings: CompanySettings }>('/api/settings')
      .then((res) => {
        setSettings(res.settings)
        if (res.settings.logo_path) setLogoUrl(`/api/settings/logo/file?v=${Date.now()}`)
      })
      .catch(() => {})
  }, [user])

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' })
    onLogout()
    navigate('/login')
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          {logoUrl ? (
            <img src={logoUrl} alt="Logotipo" className="brand-logo" />
          ) : (
            <div className="brand-placeholder">{companyInitials(settings?.company_name ?? 'Qualitra')}</div>
          )}
          <div>
            <strong>{settings?.system_name ?? 'Qualitra'}</strong>
            <span className="muted">{settings?.company_name || 'Tu empresa'}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="muted">{user.name}</span>
          <button type="button" className="btn ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <nav className="nav-tabs">
        <NavLink to="/" end>
          Inicio
        </NavLink>
        {can(user, 'configure') && (
          <>
            <NavLink to="/usuarios">Usuarios</NavLink>
            <NavLink to="/roles">Roles</NavLink>
          </>
        )}
        {user.hasImplementorAccess && <NavLink to="/implementador">Implementador</NavLink>}
        <NavLink to="/permisos">Prueba permisos</NavLink>
      </nav>

      <Outlet />
    </div>
  )
}
