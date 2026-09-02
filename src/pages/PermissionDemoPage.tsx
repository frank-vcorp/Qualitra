import { useState } from 'react'
import { api } from '../api'
import type { User } from '../types'
import { can } from '../types'

type Props = {
  user: User
}

export function PermissionDemoPage({ user }: Props) {
  const [results, setResults] = useState<Record<string, string>>({})

  async function tryAction(key: string, path: string, method = 'GET') {
    try {
      const res = await api<{ message?: string; ok?: boolean }>(path, { method })
      setResults((prev) => ({ ...prev, [key]: res.message ?? 'Permitido ✓' }))
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : 'Denegado',
      }))
    }
  }

  return (
    <main className="grid">
      <section className="card full">
        <h2>Prueba de permisos</h2>
        <p className="lead">
          Usuario: <strong>{user.name}</strong> — verifica qué acciones permite tu rol actual.
        </p>
        <div className="demo-actions">
          <button
            type="button"
            className="btn primary"
            disabled={!can(user, 'create')}
            onClick={() => tryAction('capture', '/api/demo/capture')}
          >
            Simular captura
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!can(user, 'edit')}
            onClick={() => tryAction('edit', '/api/demo/record/demo-001', 'PUT')}
          >
            Simular edición
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!can(user, 'configure')}
            onClick={() => tryAction('config', '/api/demo/config')}
          >
            Simular configuración
          </button>
        </div>
        <dl className="status-list">
          {Object.entries(results).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  )
}
