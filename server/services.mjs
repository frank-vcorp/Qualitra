import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { query } from './db.mjs'

const RECOVERY_CODE_COUNT = 8

export function generateRecoveryCodes() {
  const plain = []
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const part = crypto.randomBytes(3).toString('hex').toUpperCase()
    plain.push(part)
  }
  return plain
}

export function formatRecoveryCodes(codes) {
  return codes.map((code) => {
    const c = code.toUpperCase()
    return c.length >= 4 ? `${c.slice(0, 3)}-${c.slice(3)}` : c
  })
}

export async function hashRecoveryCode(code) {
  const normalized = code.replace(/[\s-]/g, '').toUpperCase()
  return bcrypt.hash(normalized, 10)
}

export async function verifyRecoveryCode(code, hash) {
  const normalized = code.replace(/[\s-]/g, '').toUpperCase()
  return bcrypt.compare(normalized, hash)
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export async function getOwner() {
  const { rows } = await query('SELECT id, email, name, created_at FROM owners LIMIT 1')
  return rows[0] ?? null
}

export async function getOwnerWithPassword(email) {
  const { rows } = await query(
    'SELECT id, email, name, password_hash, created_at FROM owners WHERE email = $1',
    [email.toLowerCase().trim()],
  )
  return rows[0] ?? null
}

export async function createOwner({ email, name, password, recoveryCodesPlain }) {
  const passwordHash = await hashPassword(password)
  const { rows } = await query(
    `INSERT INTO owners (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, created_at`,
    [email.toLowerCase().trim(), name.trim(), passwordHash],
  )
  const owner = rows[0]

  for (const code of recoveryCodesPlain) {
    const codeHash = await hashRecoveryCode(code)
    await query(
      'INSERT INTO recovery_codes (owner_id, code_hash) VALUES ($1, $2)',
      [owner.id, codeHash],
    )
  }

  await query(
    `INSERT INTO company_settings (id, company_name, system_name)
     VALUES (1, '', 'Qualitra')
     ON CONFLICT (id) DO NOTHING`,
  )

  return owner
}

export async function consumeRecoveryCode(ownerId, code) {
  const { rows } = await query(
    `SELECT id, code_hash FROM recovery_codes
     WHERE owner_id = $1 AND used_at IS NULL`,
    [ownerId],
  )

  for (const row of rows) {
    const match = await verifyRecoveryCode(code, row.code_hash)
    if (match) {
      await query('UPDATE recovery_codes SET used_at = NOW() WHERE id = $1', [row.id])
      return true
    }
  }
  return false
}

export async function resetOwnerPassword(ownerId, newPassword) {
  const passwordHash = await hashPassword(newPassword)
  await query('UPDATE owners SET password_hash = $1 WHERE id = $2', [passwordHash, ownerId])
}

export async function getCompanySettings() {
  const { rows } = await query('SELECT * FROM company_settings WHERE id = 1')
  return rows[0] ?? null
}

export async function updateCompanySettings(settings) {
  const { rows } = await query(
    `UPDATE company_settings SET
      company_name = $1,
      system_name = $2,
      logo_path = COALESCE($3, logo_path),
      language = $4,
      timezone = $5,
      currency = $6,
      admin_contact = $7,
      updated_at = NOW()
     WHERE id = 1
     RETURNING *`,
    [
      settings.company_name,
      settings.system_name,
      settings.logo_path ?? null,
      settings.language,
      settings.timezone,
      settings.currency,
      settings.admin_contact ?? null,
    ],
  )
  return rows[0]
}

export async function setLogoPath(logoPath) {
  const { rows } = await query(
    `UPDATE company_settings SET logo_path = $1, updated_at = NOW() WHERE id = 1 RETURNING *`,
    [logoPath],
  )
  return rows[0]
}

export async function recordAudit({ action, actorEmail, actorId, metadata = {}, ipAddress }) {
  await query(
    `INSERT INTO audit_events (action, actor_email, actor_id, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [action, actorEmail ?? null, actorId ?? null, JSON.stringify(metadata), ipAddress ?? null],
  )
}

export async function listRecentAudit(limit = 50) {
  const { rows } = await query(
    `SELECT id, action, actor_email, metadata, ip_address, created_at
     FROM audit_events
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  )
  return rows
}

export async function countUnusedRecoveryCodes(ownerId) {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS count FROM recovery_codes WHERE owner_id = $1 AND used_at IS NULL',
    [ownerId],
  )
  return rows[0]?.count ?? 0
}
