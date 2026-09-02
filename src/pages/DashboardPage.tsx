import { FormEvent, useEffect, useState } from 'react'
import { api, apiForm } from '../api'
import type { AuditEvent, CompanySettings, Owner } from '../types'
import { companyInitials, formatAction } from '../types'

type Props = {
  owner: Owner
  onLogout: () => void
}

type StatusInfo = {
  version: string
  module: string
  environment: string
  database: string
  uptimeSeconds: number
  startedAt: string
  recoveryCodesRemaining: number
  build: { node: string; commit: string | null }
}

export function DashboardPage({ owner, onLogout }: Props) {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [status, setStatus] = useState<StatusInfo | null>(null)
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    const [settingsRes, statusRes, auditRes] = await Promise.all([
      api<{ settings: CompanySettings }>('/api/settings'),
      api<StatusInfo>('/api/status'),
      api<{ events: AuditEvent[] }>('/api/audit?limit=20'),
    ])
    setSettings(settingsRes.settings)
    setStatus(statusRes)
    setAudit(auditRes.events)
    if (settingsRes.settings.logo_path) {
      setLogoUrl(`/api/settings/logo/file?v=${Date.now()}`)
    } else {
      setLogoUrl(null)
    }
  }

  useEffect(() => {
    loadAll().catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar'))
  }, [])

  async function saveSettings(e: FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await api<{ settings: CompanySettings }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
      setSettings(res.settings)
      setMessage('Configuración guardada')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function uploadLogo(file: File) {
    const form = new FormData()
    form.append('logo', file)
    const res = await apiForm<{ logoUrl: string; settings: CompanySettings }>('/api/settings/logo', form)
    setSettings(res.settings)
    setLogoUrl(res.logoUrl)
    setMessage('Logotipo actualizado')
    await loadAll()
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' })
    onLogout()
  }

  const displayName = settings?.company_name || 'Tu empresa'
  const systemName = settings?.system_name || 'Qualitra'

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          {logoUrl ? (
            <img src={logoUrl} alt="Logotipo" className="brand-logo" />
          ) : (
            <div className="brand-placeholder" aria-hidden>
              {companyInitials(displayName)}
            </div>
          )}
          <div>
            <strong>{systemName}</strong>
            <span className="muted">{displayName}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="muted">{owner.name}</span>
          <button type="button" className="btn ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Configuración de empresa</h2>
          <p className="lead">Piloto ALSA · Español · America/Mexico_City · MXN</p>
          {settings && (
            <form onSubmit={saveSettings} className="stack">
              <label>
                Nombre de la empresa
                <input
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  placeholder="ALSA"
                  required
                />
              </label>
              <label>
                Nombre visible del sistema
                <input
                  value={settings.system_name}
                  onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                  required
                />
              </label>
              <label>
                Idioma
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                >
                  <option value="es">Español</option>
                </select>
              </label>
              <label>
                Zona horaria
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                >
                  <option value="America/Mexico_City">America/Mexico_City</option>
                </select>
              </label>
              <label>
                Moneda
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                >
                  <option value="MXN">MXN</option>
                </select>
              </label>
              <label>
                Contacto administrativo
                <input
                  value={settings.admin_contact ?? ''}
                  onChange={(e) => setSettings({ ...settings, admin_contact: e.target.value })}
                  placeholder="frank@vcorp.mx"
                />
              </label>
              <label>
                Logotipo (opcional)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadLogo(file).catch((err) => setError(err.message))
                  }}
                />
              </label>
              {!logoUrl && (
                <p className="muted">
                  Sin logotipo: se muestran las iniciales de la empresa ({companyInitials(displayName)}).
                </p>
              )}
              {message && <p className="success">{message}</p>}
              {error && <p className="error">{error}</p>}
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar configuración'}
              </button>
            </form>
          )}
        </section>

        <section className="card">
          <h2>Estado del sistema</h2>
          {status && (
            <dl className="status-list">
              <div>
                <dt>Versión</dt>
                <dd>{status.version}</dd>
              </div>
              <div>
                <dt>Módulo</dt>
                <dd>{status.module}</dd>
              </div>
              <div>
                <dt>Base de datos</dt>
                <dd className={status.database === 'connected' ? 'ok' : 'bad'}>{status.database}</dd>
              </div>
              <div>
                <dt>Entorno</dt>
                <dd>{status.environment}</dd>
              </div>
              <div>
                <dt>Tiempo activo</dt>
                <dd>{Math.floor(status.uptimeSeconds / 60)} min</dd>
              </div>
              <div>
                <dt>Códigos de recuperación disponibles</dt>
                <dd>{status.recoveryCodesRemaining}</dd>
              </div>
              <div>
                <dt>Node</dt>
                <dd>{status.build.node}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="card full">
          <h2>Auditoría reciente</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Usuario</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.created_at).toLocaleString('es-MX')}</td>
                    <td>{formatAction(event.action)}</td>
                    <td>{event.actor_email ?? '—'}</td>
                    <td>{event.ip_address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
