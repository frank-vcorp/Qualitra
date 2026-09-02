import { query, getPool } from './db.mjs'
import { hashPassword } from './services.mjs'

export async function getUserById(id) {
  const { rows } = await query(
    `SELECT id, email, name, phone, is_active, is_owner, created_at, updated_at
     FROM users WHERE id = $1`,
    [id],
  )
  return rows[0] ?? null
}

export async function getUserWithPassword(email) {
  const { rows } = await query(
    `SELECT id, email, name, phone, password_hash, is_active, is_owner, created_at
     FROM users WHERE email = $1`,
    [email.toLowerCase().trim()],
  )
  return rows[0] ?? null
}

export async function getOwnerUser() {
  const { rows } = await query(
    `SELECT id, email, name, phone, is_active, is_owner, created_at
     FROM users WHERE is_owner = TRUE LIMIT 1`,
  )
  return rows[0] ?? null
}

export async function listUsers() {
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, u.phone, u.is_active, u.is_owner, u.created_at,
            COALESCE(json_agg(json_build_object('id', r.id, 'slug', r.slug, 'name', r.name))
              FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id
     ORDER BY u.created_at ASC`,
  )
  return rows.map((row) => ({ ...row, roles: row.roles ?? [] }))
}

export async function getUserPermissions(userId) {
  const { rows } = await query(
    `SELECT DISTINCT rp.action, rp.scope
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId],
  )
  return rows
}

export async function hasActiveImplementorGrant(userId) {
  const { rows } = await query(
    `SELECT id FROM implementor_grants
     WHERE user_id = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [userId],
  )
  return rows.length > 0
}

export async function getActiveImplementorGrant(userId) {
  const { rows } = await query(
    `SELECT id, expires_at, created_at
     FROM implementor_grants
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY expires_at DESC LIMIT 1`,
    [userId],
  )
  return rows[0] ?? null
}

export async function loadAuthUser(userId) {
  const user = await getUserById(userId)
  if (!user || !user.is_active) return null
  const permissions = user.is_owner ? [] : await getUserPermissions(userId)
  const hasImplementorAccess =
    user.is_owner || (await hasActiveImplementorGrant(userId))
  return { ...user, permissions, hasImplementorAccess }
}

export async function createUser({ email, name, phone, password, roleIds, actorId }) {
  const passwordHash = await hashPassword(password)
  const { rows } = await query(
    `INSERT INTO users (email, name, phone, password_hash, is_active, is_owner)
     VALUES ($1, $2, $3, $4, TRUE, FALSE)
     RETURNING id, email, name, phone, is_active, is_owner, created_at`,
    [email.toLowerCase().trim(), name.trim(), phone?.trim() || null, passwordHash],
  )
  const user = rows[0]
  for (const roleId of roleIds ?? []) {
    await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
      user.id,
      roleId,
    ])
  }
  return user
}

export async function updateUser(userId, { name, phone, is_active, roleIds }) {
  if (name !== undefined || phone !== undefined || is_active !== undefined) {
    await query(
      `UPDATE users SET
        name = COALESCE($2, name),
        phone = COALESCE($3, phone),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
       WHERE id = $1 AND is_owner = FALSE`,
      [userId, name ?? null, phone ?? null, is_active ?? null],
    )
  }
  const ownerCheck = await getUserById(userId)
  if (ownerCheck?.is_owner && (is_active === false || roleIds)) {
    throw new Error('No se puede modificar el propietario de esta forma')
  }
  if (roleIds && !ownerCheck?.is_owner) {
    await query('DELETE FROM user_roles WHERE user_id = $1', [userId])
    for (const roleId of roleIds) {
      await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId])
    }
  }
  return getUserById(userId)
}

export async function setUserPassword(userId, password) {
  const passwordHash = await hashPassword(password)
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    passwordHash,
    userId,
  ])
}

export async function revokeUserSessions(userId) {
  const pool = getPool()
  await pool.query(
    `DELETE FROM sessions
     WHERE sess::jsonb->>'userId' = $1 OR sess::jsonb->>'ownerId' = $1`,
    [userId],
  )
}

export async function grantImplementorAccess(userId, grantedBy, expiresAt) {
  await query(
    `INSERT INTO implementor_grants (user_id, granted_by, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, grantedBy, expiresAt],
  )
}

export async function revokeImplementorAccess(userId) {
  await query(
    `UPDATE implementor_grants SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  )
  await revokeUserSessions(userId)
}

export async function listImplementorGrants(userId) {
  const { rows } = await query(
    `SELECT ig.id, ig.expires_at, ig.revoked_at, ig.created_at,
            g.name AS granted_by_name, g.email AS granted_by_email
     FROM implementor_grants ig
     JOIN users g ON g.id = ig.granted_by
     WHERE ig.user_id = $1
     ORDER BY ig.created_at DESC`,
    [userId],
  )
  return rows
}
