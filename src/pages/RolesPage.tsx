import { FormEvent, useEffect, useState } from 'react'
import { api } from '../api'
import type { Role } from '../types'
import { ACTION_LABELS, ACTION_OPTIONS, SCOPE_LABELS, SCOPE_OPTIONS } from '../types'

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<Array<{ action: string; scope: string }>>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const res = await api<{ roles: Role[] }>('/api/admin/roles')
    setRoles(res.roles)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  function selectRole(role: Role) {
    setSelectedId(role.id)
    setPermissions([...role.permissions])
    setName(role.name)
    setDescription(role.description ?? '')
  }

  function addPermission() {
    setPermissions([...permissions, { action: 'view', scope: 'own' }])
  }

  async function saveRole(e: FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    try {
      await api(`/api/admin/roles/${selectedId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, description, permissions }),
      })
      setMessage('Rol actualizado')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  async function createRole(e: FormEvent) {
    e.preventDefault()
    try {
      await api('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ name, description, permissions }),
      })
      setMessage('Rol creado')
      setName('')
      setDescription('')
      setPermissions([])
      setSelectedId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <main className="grid">
      <section className="card">
        <h2>Roles del sistema</h2>
        <ul className="role-list">
          {roles.map((role) => (
            <li key={role.id}>
              <button type="button" className="btn ghost wide" onClick={() => selectRole(role)}>
                {role.name}
                {role.is_system && <span className="badge">Sistema</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>{selectedId ? 'Editar rol' : 'Nuevo rol'}</h2>
        <form onSubmit={selectedId ? saveRole : createRole} className="stack">
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Descripción
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="perm-editor">
            <div className="perm-editor-head">
              <strong>Permisos</strong>
              <button type="button" className="btn ghost" onClick={addPermission}>
                + Permiso
              </button>
            </div>
            {permissions.map((perm, idx) => (
              <div key={idx} className="perm-row">
                <select
                  value={perm.action}
                  onChange={(e) => {
                    const next = [...permissions]
                    next[idx] = { ...next[idx], action: e.target.value }
                    setPermissions(next)
                  }}
                >
                  {ACTION_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {ACTION_LABELS[a]}
                    </option>
                  ))}
                </select>
                <select
                  value={perm.scope}
                  onChange={(e) => {
                    const next = [...permissions]
                    next[idx] = { ...next[idx], scope: e.target.value }
                    setPermissions(next)
                  }}
                >
                  {SCOPE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {SCOPE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
          <button type="submit" className="btn primary">
            {selectedId ? 'Guardar rol' : 'Crear rol'}
          </button>
        </form>
      </section>
    </main>
  )
}
