import express from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import multer from 'multer'
import path from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getPool } from './db.mjs'
import {
  attachUser,
  clientIp,
  publicUser,
  requireAuth,
  requirePermission,
  setSessionUser,
} from './auth.mjs'
import { createAdminRouter, createDemoRouter, loginUser } from './admin-routes.mjs'
import {
  createOwner,
  formatRecoveryCodes,
  generateRecoveryCodes,
  getCompanySettings,
  getOwner,
  getOwnerWithPassword,
  consumeRecoveryCode,
  resetOwnerPassword,
  updateCompanySettings,
  setLogoPath,
  clearLogoPath,
  recordAudit,
  listRecentAudit,
  countUnusedRecoveryCodes,
} from './services.mjs'
import { loadAuthUser } from './users.mjs'
import { resetOwnerAccess } from './maintenance.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')
const logosDir = path.join(dataDir, 'logos')

mkdirSync(logosDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: logosDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png'
      cb(null, `logo${ext}`)
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    cb(null, allowed.includes(file.mimetype))
  },
})

const authChain = [requireAuth, attachUser]

export function createApiRouter() {
  const router = express.Router()

  router.get('/health', async (_req, res) => {
    let dbOk = false
    try {
      await getPool().query('SELECT 1')
      dbOk = true
    } catch {
      dbOk = false
    }
    res.json({
      ok: dbOk,
      service: 'qualitra',
      version: process.env.APP_VERSION || '0.2.0-m01',
      database: dbOk ? 'connected' : 'disconnected',
      uptimeSeconds: Math.floor(process.uptime()),
    })
  })

  router.get('/setup/status', async (_req, res) => {
    const owner = await getOwner()
    res.json({ needsSetup: !owner })
  })

  router.post('/maintenance/reset-owner', async (req, res) => {
    const expected = process.env.OWNER_RESET_TOKEN
    const provided = req.headers['x-reset-token']
    if (!expected || provided !== expected) {
      return res.status(404).json({ error: 'No encontrado' })
    }
    const email = req.body?.email ?? 'frank@vcorp.mx'
    try {
      const result = await resetOwnerAccess(email)
      res.json({
        ok: true,
        message: 'Acceso restablecido. Guarda la contraseña y los códigos ahora.',
        ...result,
      })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al restablecer' })
    }
  })

  router.post('/setup/owner', async (req, res) => {
    const existing = await getOwner()
    if (existing) {
      return res.status(409).json({ error: 'El propietario ya fue creado' })
    }

    const { email, name, password, passwordConfirm } = req.body ?? {}
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Correo, nombre y contraseña son obligatorios' })
    }
    if (password.length < 10) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 10 caracteres' })
    }
    if (password !== passwordConfirm) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden' })
    }

    const plainCodes = generateRecoveryCodes()
    const owner = await createOwner({
      email,
      name,
      password,
      recoveryCodesPlain: plainCodes,
    })

    await recordAudit({
      action: 'owner.created',
      actorEmail: owner.email,
      actorId: owner.id,
      metadata: { name: owner.name },
      ipAddress: clientIp(req),
    })

    const authUser = await loadAuthUser(owner.id)
    setSessionUser(req, authUser)

    await recordAudit({
      action: 'auth.login',
      actorEmail: owner.email,
      actorId: owner.id,
      ipAddress: clientIp(req),
    })

    res.status(201).json({
      user: publicUser(authUser),
      owner: { id: owner.id, email: owner.email, name: owner.name },
      recoveryCodes: formatRecoveryCodes(plainCodes),
    })
  })

  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' })
    }

    const authUser = await loginUser(email, password)
    if (!authUser) {
      await recordAudit({
        action: 'auth.login_failed',
        actorEmail: email.toLowerCase().trim(),
        metadata: { reason: 'invalid_credentials' },
        ipAddress: clientIp(req),
      })
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    setSessionUser(req, authUser)

    await recordAudit({
      action: 'auth.login',
      actorEmail: authUser.email,
      actorId: authUser.id,
      ipAddress: clientIp(req),
    })

    res.json({ user: publicUser(authUser), owner: { id: authUser.id, email: authUser.email, name: authUser.name } })
  })

  router.post('/auth/logout', requireAuth, attachUser, async (req, res) => {
    const userId = req.session.userId ?? req.session.ownerId
    const userEmail = req.session.userEmail ?? req.session.ownerEmail
    req.session.destroy(async () => {
      await recordAudit({
        action: 'auth.logout',
        actorEmail: userEmail,
        actorId: userId,
        ipAddress: clientIp(req),
      })
      res.clearCookie('qualitra.sid')
      res.json({ ok: true })
    })
  })

  router.get('/auth/me', requireAuth, attachUser, async (req, res) => {
    res.json({
      user: publicUser(req.user),
      owner: { id: req.user.id, email: req.user.email, name: req.user.name },
    })
  })

  router.post('/auth/recovery/reset', async (req, res) => {
    const { email, recoveryCode, newPassword, newPasswordConfirm } = req.body ?? {}
    if (!email || !recoveryCode || !newPassword) {
      return res.status(400).json({ error: 'Datos incompletos' })
    }
    if (newPassword.length < 10) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 10 caracteres' })
    }
    if (newPassword !== newPasswordConfirm) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden' })
    }

    const owner = await getOwnerWithPassword(email)
    if (!owner) {
      return res.status(400).json({ error: 'No se pudo restablecer el acceso' })
    }

    const consumed = await consumeRecoveryCode(owner.id, recoveryCode)
    if (!consumed) {
      await recordAudit({
        action: 'auth.recovery_failed',
        actorEmail: email.toLowerCase().trim(),
        metadata: { reason: 'invalid_code' },
        ipAddress: clientIp(req),
      })
      return res.status(400).json({ error: 'Código de recuperación inválido o ya utilizado' })
    }

    await resetOwnerPassword(owner.id, newPassword)
    await recordAudit({
      action: 'auth.recovery_success',
      actorEmail: owner.email,
      actorId: owner.id,
      ipAddress: clientIp(req),
    })

    res.json({ ok: true, message: 'Contraseña restablecida. Inicia sesión con tu nueva contraseña.' })
  })

  router.get('/settings', ...authChain, requirePermission('view'), async (_req, res) => {
    const settings = await getCompanySettings()
    const safe = { ...(settings ?? {}) }
    if (safe.logo_path) {
      const fullPath = path.join(dataDir, safe.logo_path)
      if (!existsSync(fullPath)) {
        safe.logo_path = null
      }
    }
    res.json({ settings: safe })
  })

  router.put('/settings', ...authChain, requirePermission('configure'), async (req, res) => {
    const body = req.body ?? {}
    const current = await getCompanySettings()
    const updated = await updateCompanySettings({
      company_name: body.company_name ?? current?.company_name ?? '',
      system_name: body.system_name ?? current?.system_name ?? 'Qualitra',
      logo_path: current?.logo_path ?? null,
      language: body.language ?? current?.language ?? 'es',
      timezone: body.timezone ?? current?.timezone ?? 'America/Mexico_City',
      currency: body.currency ?? current?.currency ?? 'MXN',
      admin_contact: body.admin_contact ?? current?.admin_contact ?? null,
    })

    await recordAudit({
      action: 'settings.updated',
      actorEmail: req.user.email,
      actorId: req.user.id,
      metadata: { company_name: updated.company_name, system_name: updated.system_name },
      ipAddress: clientIp(req),
    })

    res.json({ settings: updated })
  })

  router.post('/settings/logo', ...authChain, requirePermission('configure'), upload.single('logo'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo de imagen requerido (PNG, JPG, WebP, GIF, máx. 2 MB)' })
    }

    const relativePath = path.join('logos', req.file.filename)
    const updated = await setLogoPath(relativePath)

    await recordAudit({
      action: 'settings.logo_updated',
      actorEmail: req.user.email,
      actorId: req.user.id,
      metadata: { filename: req.file.filename },
      ipAddress: clientIp(req),
    })

    res.json({ settings: updated, logoUrl: `/api/settings/logo/file?v=${Date.now()}` })
  })

  router.get('/settings/logo/file', ...authChain, requirePermission('view'), async (req, res) => {
    const settings = await getCompanySettings()
    if (!settings?.logo_path) {
      return res.status(404).json({ error: 'Sin logotipo' })
    }
    const fullPath = path.join(dataDir, settings.logo_path)
    if (!existsSync(fullPath)) {
      await clearLogoPath()
      await recordAudit({
        action: 'settings.logo_missing',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { path: settings.logo_path },
        ipAddress: clientIp(req),
      })
      return res.status(404).json({ error: 'Archivo no encontrado' })
    }
    res.sendFile(fullPath)
  })

  router.get('/status', ...authChain, requirePermission('view'), async (req, res) => {
    let dbOk = false
    try {
      await getPool().query('SELECT 1')
      dbOk = true
    } catch {
      dbOk = false
    }

    const unusedCodes = req.user.is_owner ? await countUnusedRecoveryCodes(req.user.id) : null

    res.json({
      version: process.env.APP_VERSION || '0.2.0-m01',
      module: 'M01',
      environment: process.env.NODE_ENV || 'development',
      database: dbOk ? 'connected' : 'disconnected',
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      recoveryCodesRemaining: unusedCodes,
      build: { node: process.version, commit: process.env.GIT_COMMIT || null },
    })
  })

  router.get('/audit', ...authChain, requirePermission('audit'), async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const events = await listRecentAudit(limit)
    res.json({ events })
  })

  router.use('/admin', createAdminRouter())
  router.use('/demo', createDemoRouter())

  return router
}

export function createSessionMiddleware() {
  const PgSession = connectPgSimple(session)
  return session({
    store: new PgSession({
      pool: getPool(),
      tableName: 'sessions',
      createTableIfMissing: false,
    }),
    name: 'qualitra.sid',
    secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me-32chars-min',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
}
