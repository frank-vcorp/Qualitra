import { query } from './db.mjs'
import { ACTIONS, SCOPES } from './permissions.mjs'

export async function listRoles() {
  const { rows } = await query(
    `SELECT r.id, r.slug, r.name, r.description, r.is_system,
            COALESCE(json_agg(json_build_object('action', rp.action, 'scope', rp.scope))
              FILTER (WHERE rp.id IS NOT NULL), '[]') AS permissions
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     GROUP BY r.id
     ORDER BY r.name ASC`,
  )
  return rows.map((r) => ({ ...r, permissions: r.permissions ?? [] }))
}

export async function getRoleById(id) {
  const { rows } = await query('SELECT * FROM roles WHERE id = $1', [id])
  return rows[0] ?? null
}

export async function createRole({ name, description, permissions }) {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const { rows } = await query(
    `INSERT INTO roles (slug, name, description, is_system)
     VALUES ($1, $2, $3, FALSE)
     RETURNING *`,
    [slug, name.trim(), description?.trim() || null],
  )
  const role = rows[0]
  await setRolePermissions(role.id, permissions ?? [])
  return listRoles().then((all) => all.find((r) => r.id === role.id))
}

export async function setRolePermissions(roleId, permissions) {
  validatePermissions(permissions)
  await query('DELETE FROM role_permissions WHERE role_id = $1', [roleId])
  for (const perm of permissions) {
    await query('INSERT INTO role_permissions (role_id, action, scope) VALUES ($1, $2, $3)', [
      roleId,
      perm.action,
      perm.scope,
    ])
  }
}

export async function updateRole(roleId, { name, description, permissions }) {
  const role = await getRoleById(roleId)
  if (!role) throw new Error('Rol no encontrado')
  if (name || description !== undefined) {
    await query(
      `UPDATE roles SET name = COALESCE($2, name), description = COALESCE($3, description), updated_at = NOW()
       WHERE id = $1`,
      [roleId, name ?? null, description ?? null],
    )
  }
  if (permissions) {
    await setRolePermissions(roleId, permissions)
  }
  return listRoles().then((all) => all.find((r) => r.id === roleId))
}

function validatePermissions(permissions) {
  for (const perm of permissions) {
    if (!ACTIONS.includes(perm.action)) {
      throw new Error(`Acción inválida: ${perm.action}`)
    }
    if (!SCOPES.includes(perm.scope)) {
      throw new Error(`Alcance inválido: ${perm.scope}`)
    }
  }
}

export async function deleteRole(roleId) {
  const role = await getRoleById(roleId)
  if (!role) throw new Error('Rol no encontrado')
  if (role.is_system) throw new Error('No se pueden eliminar roles del sistema')
  await query('DELETE FROM roles WHERE id = $1', [roleId])
}
