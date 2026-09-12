import crypto from 'node:crypto'
import { query, getPool } from './db.mjs'
import { hashPassword, hashRecoveryCode, recordAudit } from './services.mjs'

export function formatRecoveryCodes(codes) {
  return codes.map((code) => {
    const c = code.toUpperCase()
    return c.length >= 4 ? `${c.slice(0, 3)}-${c.slice(3)}` : c
  })
}

export async function resetOwnerAccess(email) {
  const normalized = email.toLowerCase().trim()
  const { rows } = await query(
    `SELECT id, email, name FROM users WHERE email = $1 AND is_owner = TRUE`,
    [normalized],
  )
  if (!rows[0]) {
    throw new Error('Propietario no encontrado')
  }

  const userId = rows[0].id
  const tempPassword = `Qualitra-${crypto.randomBytes(4).toString('hex')}!`
  const passwordHash = await hashPassword(tempPassword)

  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    passwordHash,
    userId,
  ])
  await query('UPDATE owners SET password_hash = $1 WHERE id = $2', [passwordHash, userId])

  await query('DELETE FROM recovery_codes WHERE user_id = $1 OR owner_id = $1', [userId])
  await getPool().query(
    `DELETE FROM sessions WHERE sess::jsonb->>'userId' = $1 OR sess::jsonb->>'ownerId' = $1`,
    [userId],
  )

  const plainCodes = []
  for (let i = 0; i < 8; i++) {
    plainCodes.push(crypto.randomBytes(3).toString('hex').toUpperCase())
  }

  for (const code of plainCodes) {
    const codeHash = await hashRecoveryCode(code)
    await query(
      'INSERT INTO recovery_codes (owner_id, user_id, code_hash) VALUES ($1, $1, $2)',
      [userId, codeHash],
    )
  }

  await recordAudit({
    action: 'owner.password_reset',
    actorEmail: rows[0].email,
    actorId: userId,
    metadata: { method: 'maintenance' },
  })

  return {
    email: rows[0].email,
    name: rows[0].name,
    tempPassword,
    recoveryCodes: formatRecoveryCodes(plainCodes),
  }
}
