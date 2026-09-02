export type User = {
  id: string
  email: string
  name: string
  phone?: string | null
  isOwner?: boolean
  isActive?: boolean
  permissions: string[] | 'all'
  hasImplementorAccess?: boolean
}

export type Role = {
  id: string
  slug: string
  name: string
  description?: string | null
  is_system: boolean
  permissions: Array<{ action: string; scope: string }>
}

export type UserRow = {
  id: string
  email: string
  name: string
  phone?: string | null
  is_active: boolean
  is_owner: boolean
  roles: Array<{ id: string; slug: string; name: string }>
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

export function can(user: User | null, action: string) {
  if (!user) return false
  if (user.permissions === 'all' || user.isOwner) return true
  return user.permissions.some((p) => p.startsWith(`${action}:`))
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
    'settings.logo_missing': 'Logotipo no encontrado (referencia limpiada)',
    'user.created': 'Usuario creado',
    'user.updated': 'Usuario actualizado',
    'user.deactivated': 'Usuario desactivado',
    'user.sessions_revoked': 'Sesiones revocadas',
    'role.created': 'Rol creado',
    'role.updated': 'Rol actualizado',
    'role.deleted': 'Rol eliminado',
    'implementor.granted': 'Acceso Implementador concedido',
    'implementor.revoked': 'Acceso Implementador revocado',
  }
  return map[action] ?? action
}

export const ACTION_OPTIONS = [
  'view',
  'create',
  'edit',
  'archive',
  'export',
  'approve',
  'configure',
  'audit',
  'integrations',
] as const

export const SCOPE_OPTIONS = ['own', 'assigned', 'type_allowed', 'all_authorized'] as const

export const ACTION_LABELS: Record<string, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  archive: 'Archivar',
  export: 'Exportar',
  approve: 'Aprobar',
  configure: 'Configurar',
  audit: 'Auditoría',
  integrations: 'Integraciones',
}

export const SCOPE_LABELS: Record<string, string> = {
  own: 'Propios',
  assigned: 'Asignados',
  type_allowed: 'Por tipo',
  all_authorized: 'Todos autorizados',
}
