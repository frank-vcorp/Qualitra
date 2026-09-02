import { loadAuthUser } from './users.mjs'
import { hasPermission, hasImplementorAccess } from './permissions.mjs'

export function clientIp(req) {
  return req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip
}

export function setSessionUser(req, user) {
  req.session.userId = user.id
  req.session.userEmail = user.email
  req.session.userName = user.name
  req.session.isOwner = user.is_owner
  req.session.ownerId = user.id
  req.session.ownerEmail = user.email
  req.session.ownerName = user.name
}

export async function attachUser(req, res, next) {
  const userId = req.session?.userId ?? req.session?.ownerId
  if (!userId) {
    req.user = null
    return next()
  }
  const user = await loadAuthUser(userId)
  if (!user) {
    req.session.destroy(() => {})
    req.user = null
    return res.status(401).json({ error: 'Sesión inválida o usuario desactivado' })
  }
  req.user = user
  next()
}

export function requireAuth(req, res, next) {
  if (!req.session?.userId && !req.session?.ownerId) {
    return res.status(401).json({ error: 'No autenticado' })
  }
  attachUser(req, res, next)
}

export function requirePermission(action, scope = null) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    if (!hasPermission(req.user, action, scope)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' })
    }
    next()
  }
}

export function requireImplementor(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' })
  }
  if (!hasImplementorAccess(req.user)) {
    return res.status(403).json({ error: 'Acceso de Implementador no activo' })
  }
  next()
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone ?? null,
    isOwner: user.is_owner,
    isActive: user.is_active,
    permissions: user.is_owner
      ? 'all'
      : (user.permissions ?? []).map((p) => `${p.action}:${p.scope}`),
    hasImplementorAccess: Boolean(user.hasImplementorAccess),
  }
}
