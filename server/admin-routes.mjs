import express from 'express'
import {
  attachUser,
  clientIp,
  publicUser,
  requireAuth,
  requireImplementor,
  requirePermission,
  setSessionUser,
} from './auth.mjs'
import { recordAudit } from './services.mjs'
import {
  createUser,
  getUserById,
  getUserWithPassword,
  grantImplementorAccess,
  listImplementorGrants,
  listUsers,
  loadAuthUser,
  revokeImplementorAccess,
  revokeUserSessions,
  updateUser,
} from './users.mjs'
import { createRole, deleteRole, listRoles, updateRole } from './roles.mjs'
import { verifyPassword } from './services.mjs'

export function createAdminRouter() {
  const router = express.Router()
  router.use(requireAuth)
  router.use(attachUser)

  router.get('/users', requirePermission('configure'), async (_req, res) => {
    const users = await listUsers()
    res.json({ users })
  })

  router.post('/users', requirePermission('configure'), async (req, res) => {
    const { email, name, phone, password, roleIds } = req.body ?? {}
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Correo, nombre y contraseña son obligatorios' })
    }
    if (password.length < 10) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 10 caracteres' })
    }
    try {
      const user = await createUser({
        email,
        name,
        phone,
        password,
        roleIds: roleIds ?? [],
        actorId: req.user.id,
      })
      await recordAudit({
        action: 'user.created',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { userId: user.id, email: user.email, roles: roleIds ?? [] },
        ipAddress: clientIp(req),
      })
      res.status(201).json({ user })
    } catch (err) {
      if (err?.code === '23505') {
        return res.status(409).json({ error: 'Ya existe un usuario con ese correo' })
      }
      throw err
    }
  })

  router.patch('/users/:id', requirePermission('configure'), async (req, res) => {
    const { name, phone, is_active, roleIds } = req.body ?? {}
    try {
      const before = await getUserById(req.params.id)
      if (!before) return res.status(404).json({ error: 'Usuario no encontrado' })
      const user = await updateUser(req.params.id, { name, phone, is_active, roleIds })
      if (is_active === false) {
        await revokeUserSessions(req.params.id)
      }
      await recordAudit({
        action: is_active === false ? 'user.deactivated' : 'user.updated',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { userId: req.params.id, is_active, roleIds },
        ipAddress: clientIp(req),
      })
      res.json({ user })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al actualizar' })
    }
  })

  router.post('/users/:id/revoke-sessions', requirePermission('configure'), async (req, res) => {
    const user = await getUserById(req.params.id)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    await revokeUserSessions(req.params.id)
    await recordAudit({
      action: 'user.sessions_revoked',
      actorEmail: req.user.email,
      actorId: req.user.id,
      metadata: { userId: user.id, email: user.email },
      ipAddress: clientIp(req),
    })
    res.json({ ok: true })
  })

  router.post('/users/:id/implementor-grant', requirePermission('configure'), async (req, res) => {
    const user = await getUserById(req.params.id)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    if (user.is_owner) {
      return res.status(400).json({ error: 'El propietario ya tiene acceso total' })
    }
    const days = Number(req.body?.days ?? 7)
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    await grantImplementorAccess(user.id, req.user.id, expiresAt.toISOString())
    await recordAudit({
      action: 'implementor.granted',
      actorEmail: req.user.email,
      actorId: req.user.id,
      metadata: { userId: user.id, expiresAt: expiresAt.toISOString() },
      ipAddress: clientIp(req),
    })
    res.status(201).json({ ok: true, expiresAt: expiresAt.toISOString() })
  })

  router.post('/users/:id/implementor-revoke', requirePermission('configure'), async (req, res) => {
    const user = await getUserById(req.params.id)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    await revokeImplementorAccess(user.id)
    await recordAudit({
      action: 'implementor.revoked',
      actorEmail: req.user.email,
      actorId: req.user.id,
      metadata: { userId: user.id },
      ipAddress: clientIp(req),
    })
    res.json({ ok: true })
  })

  router.get('/users/:id/implementor-grants', requirePermission('configure'), async (req, res) => {
    const grants = await listImplementorGrants(req.params.id)
    res.json({ grants })
  })

  router.get('/roles', requirePermission('configure'), async (_req, res) => {
    res.json({ roles: await listRoles() })
  })

  router.post('/roles', requirePermission('configure'), async (req, res) => {
    const { name, description, permissions } = req.body ?? {}
    if (!name) return res.status(400).json({ error: 'Nombre obligatorio' })
    try {
      const role = await createRole({ name, description, permissions: permissions ?? [] })
      await recordAudit({
        action: 'role.created',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { roleId: role?.id, name },
        ipAddress: clientIp(req),
      })
      res.status(201).json({ role })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al crear rol' })
    }
  })

  router.put('/roles/:id', requirePermission('configure'), async (req, res) => {
    try {
      const role = await updateRole(req.params.id, req.body ?? {})
      await recordAudit({
        action: 'role.updated',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { roleId: req.params.id },
        ipAddress: clientIp(req),
      })
      res.json({ role })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al actualizar rol' })
    }
  })

  router.delete('/roles/:id', requirePermission('configure'), async (req, res) => {
    try {
      await deleteRole(req.params.id)
      await recordAudit({
        action: 'role.deleted',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { roleId: req.params.id },
        ipAddress: clientIp(req),
      })
      res.json({ ok: true })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo eliminar' })
    }
  })

  return router
}

export function createDemoRouter() {
  const router = express.Router()
  router.use(requireAuth)
  router.use(attachUser)

  router.get('/capture', requirePermission('create'), (_req, res) => {
    res.json({ ok: true, message: 'Acción de captura permitida' })
  })

  router.put('/record/:id', requirePermission('edit'), (req, res) => {
    res.json({ ok: true, message: `Edición permitida sobre ${req.params.id}` })
  })

  router.get('/config', requirePermission('configure'), (_req, res) => {
    res.json({ ok: true, message: 'Acceso de configuración permitido' })
  })

  router.get('/implementor-tools', requireImplementor, (_req, res) => {
    res.json({
      ok: true,
      tools: [
        'exportar_tipos_y_catalogos',
        'importar_tipos_y_catalogos',
        'probar_expresiones',
        'validar_dependencias',
      ],
    })
  })

  return router
}

export async function loginUser(email, password) {
  const user = await getUserWithPassword(email)
  if (!user || !user.is_active) return null
  if (!(await verifyPassword(password, user.password_hash))) return null
  return loadAuthUser(user.id)
}

export { publicUser, setSessionUser, clientIp }
