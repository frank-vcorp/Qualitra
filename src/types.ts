import './styles.css'

export type Owner = {
  id: string
  email: string
  name: string
}

export type CompanySettings = {
  company_name: string
  system_name: string
  logo_path?: string | null
  language: string
  timezone: string
  currency: string
  admin_contact?: string | null
}

export type AuditEvent = {
  id: string
  action: string
  actor_email: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export function companyInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Q'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function formatAction(action: string) {
  const map: Record<string, string> = {
    'owner.created': 'Propietario creado',
    'auth.login': 'Inicio de sesión',
    'auth.logout': 'Cierre de sesión',
    'auth.login_failed': 'Intento de acceso fallido',
    'auth.recovery_failed': 'Recuperación fallida',
    'auth.recovery_success': 'Contraseña restablecida',
    'settings.updated': 'Configuración actualizada',
    'settings.logo_updated': 'Logotipo actualizado',
  }
  return map[action] ?? action
}
