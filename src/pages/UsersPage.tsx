import { FormEvent, useEffect, useState } from 'react'
import { api } from '../api'
import type { Role, UserRow } from '../types'

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [roleIds, setRoleIds] = useState<string[]>([])

  async function load() {
    const [usersRes, rolesRes] = await Promise.all([
      api<{ users: UserRow[] }>('/api/admin/users'),
      api<{ roles: Role[] }>('/api/admin/roles'),
    ])
    setUsers(usersRes.users)
    setRoles(rolesRes.roles)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function createUser(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, password, roleIds }),
      })
      setMessage('Usuario creado')
      setName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setRoleIds([])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  async function toggleActive(user: UserRow) {
    if (user.is_owner) return
    await api(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !user.is_active }),
    })
    await load()
  }

  async function revokeSessions(userId: string) {
    await api(`/api/admin/users/${userId}/revoke-sessions`, { method: 'POST' })
    setMessage('Sesiones revocadas')
  }

  async function grantImplementor(userId: string) {
    await api(`/api/admin/users/${userId}/implementor-grant`, {
      method: 'POST',
      body: JSON.stringify({ days: 7 }),
    })
    setMessage('Acceso Implementador concedido por 7 días')
  }

  async function revokeImplementor(userId: string) {
    await api(`/api/admin/users/${userId}/implementor-revoke`, { method: 'POST' })
    setMessage('Acceso Implementador revocado')
  }

  function toggleRole(roleId: string) {
    setRoleIds((prev) => (prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]))
  }

  return (
    <main className="grid">
      <section className="card">
        <h2>Nuevo usuario</h2>
        <form onSubmit={createUser} className="stack">
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Correo
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Teléfono
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Contraseña temporal
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required />
          </label>
          <fieldset className="role-picker">
            <legend>Roles</legend>
            {roles.map((role) => (
              <label key={role.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                />
                {role.name}
              </label>
            ))}
          </fieldset>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
          <button type="submit" className="btn primary">
            Crear usuario
          </button>
        </form>
      </section>

      <section className="card full">
        <h2>Usuarios</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Roles</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.name}
                    {user.is_owner && <span className="badge">Propietario</span>}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.roles.map((r) => r.name).join(', ') || '—'}</td>
                  <td>{user.is_active ? 'Activo' : 'Inactivo'}</td>
                  <td className="actions-cell">
                    {!user.is_owner && (
                      <>
                        <button type="button" className="btn ghost" onClick={() => toggleActive(user)}>
                          {user.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button type="button" className="btn ghost" onClick={() => revokeSessions(user.id)}>
                          Revocar sesiones
                        </button>
                        <button type="button" className="btn ghost" onClick={() => grantImplementor(user.id)}>
                          + Implementador
                        </button>
                        <button type="button" className="btn ghost" onClick={() => revokeImplementor(user.id)}>
                          Revocar Impl.
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
