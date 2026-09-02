export const ACTIONS = [
  'view',
  'create',
  'edit',
  'archive',
  'export',
  'approve',
  'configure',
  'audit',
  'integrations',
]

export const SCOPES = ['own', 'assigned', 'type_allowed', 'all_authorized']

export const ACTION_LABELS = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  archive: 'Archivar',
  export: 'Exportar',
  approve: 'Aprobar',
  configure: 'Configurar',
  audit: 'Consultar auditoría',
  integrations: 'Administrar integraciones',
}

export const SCOPE_LABELS = {
  own: 'Propios',
  assigned: 'Asignados',
  type_allowed: 'Permitidos por tipo',
  all_authorized: 'Todos los autorizados',
}

/** @param {{ isOwner?: boolean, permissions?: Array<{ action: string, scope: string }>, hasImplementorAccess?: boolean }} user */
export function hasPermission(user, action, scope = null) {
  if (user?.isOwner) return true
  const perms = user?.permissions ?? []
  const matches = perms.filter((p) => p.action === action)
  if (matches.length === 0) return false
  if (!scope) return true
  return matches.some((p) => p.scope === scope)
}

export function hasImplementorAccess(user) {
  if (user?.isOwner) return true
  return Boolean(user?.hasImplementorAccess)
}
