import express from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import multer from 'multer'
import path from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getPool } from './db.mjs'
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
  recordAudit,
  listRecentAudit,
  verifyPassword,
  countUnusedRecoveryCodes,
} from './services.mjs'

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

function clientIp(req) {
  return req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip
}

function requireAuth(req, res, next) {
  if (!req.session?.ownerId) {
    return res.status(401).json({ error: 'No autenticado' })
  }
  next()
}

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
      version: process.env.APP_VERSION || '0.1.0-m00',
      database: dbOk ? 'connected' : 'disconnected',
      uptimeSeconds: Math.floor(process.uptime()),
    })
  })

  router.get('/setup/status', async (_req, res) => {
    const owner = await getOwner()
    res.json({ needsSetup: !owner })
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

    req.session.ownerId = owner.id
    req.session.ownerEmail = owner.email
    req.session.ownerName = owner.name

    await recordAudit({
      action: 'auth.login',
      actorEmail: owner.email,
      actorId: owner.id,
      ipAddress: clientIp(req),
    })

    res.status(201).json({
      owner: { id: owner.id, email: owner.email, name: owner.name },
      recoveryCodes: formatRecoveryCodes(plainCodes),
    })
  })

  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' })
    }

    const owner = await getOwnerWithPassword(email)
    if (!owner || !(await verifyPassword(password, owner.password_hash))) {
      await recordAudit({
        action: 'auth.login_failed',
        actorEmail: email.toLowerCase().trim(),
        metadata: { reason: 'invalid_credentials' },
        ipAddress: clientIp(req),
      })
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    req.session.ownerId = owner.id
    req.session.ownerEmail = owner.email
    req.session.ownerName = owner.name

    await recordAudit({
      action: 'auth.login',
      actorEmail: owner.email,
      actorId: owner.id,
      ipAddress: clientIp(req),
    })

    res.json({
      owner: { id: owner.id, email: owner.email, name: owner.name },
    })
  })

  router.post('/auth/logout', requireAuth, async (req, res) => {
    const { ownerId, ownerEmail } = req.session
    req.session.destroy(async () => {
      await recordAudit({
        action: 'auth.logout',
        actorEmail: ownerEmail,
        actorId: ownerId,
        ipAddress: clientIp(req),
      })
      res.clearCookie('qualitra.sid')
      res.json({ ok: true })
    })
  })

  router.get('/auth/me', async (req, res) => {
    if (!req.session?.ownerId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    res.json({
      owner: {
        id: req.session.ownerId,
        email: req.session.ownerEmail,
        name: req.session.ownerName,
      },
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

  router.get('/settings', requireAuth, async (_req, res) => {
    const settings = await getCompanySettings()
    res.json({ settings: settings ?? {} })
  })

  router.put('/settings', requireAuth, async (req, res) => {
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
      actorEmail: req.session.ownerEmail,
      actorId: req.session.ownerId,
      metadata: {
        company_name: updated.company_name,
        system_name: updated.system_name,
      },
      ipAddress: clientIp(req),
    })

    res.json({ settings: updated })
  })

  router.post('/settings/logo', requireAuth, upload.single('logo'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo de imagen requerido (PNG, JPG, WebP, GIF, máx. 2 MB)' })
    }

    const relativePath = path.join('logos', req.file.filename)
    const updated = await setLogoPath(relativePath)

    await recordAudit({
      action: 'settings.logo_updated',
      actorEmail: req.session.ownerEmail,
      actorId: req.session.ownerId,
      metadata: { filename: req.file.filename },
      ipAddress: clientIp(req),
    })

    res.json({ settings: updated, logoUrl: `/api/settings/logo/file?v=${Date.now()}` })
  })

  router.get('/settings/logo/file', requireAuth, async (_req, res) => {
    const settings = await getCompanySettings()
    if (!settings?.logo_path) {
      return res.status(404).json({ error: 'Sin logotipo' })
    }
    const fullPath = path.join(dataDir, settings.logo_path)
    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' })
    }
    res.sendFile(fullPath)
  })

  router.get('/status', requireAuth, async (req, res) => {
    let dbOk = false
    try {
      await getPool().query('SELECT 1')
      dbOk = true
    } catch {
      dbOk = false
    }

    const unusedCodes = await countUnusedRecoveryCodes(req.session.ownerId)

    res.json({
      version: process.env.APP_VERSION || '0.1.0-m00',
      module: 'M00',
      environment: process.env.NODE_ENV || 'development',
      database: dbOk ? 'connected' : 'disconnected',
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      recoveryCodesRemaining: unusedCodes,
      build: {
        node: process.version,
        commit: process.env.GIT_COMMIT || null,
      },
    })
  })

  router.get('/audit', requireAuth, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const events = await listRecentAudit(limit)
    res.json({ events })
  })

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
