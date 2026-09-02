import { useEffect, useState } from 'react'
import { api } from '../api'

export function ImplementorPage() {
  const [tools, setTools] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api<{ tools: string[] }>('/api/demo/implementor-tools')
      .then((res) => setTools(res.tools))
      .catch((err) => setError(err instanceof Error ? err.message : 'Sin acceso'))
  }, [])

  return (
    <main className="grid">
      <section className="card">
        <h2>Herramientas Implementador</h2>
        <p className="lead">Acceso profesional para transportar configuraciones (base M01).</p>
        {error && <p className="error">{error}</p>}
        {!error && (
          <ul className="tool-list">
            {tools.map((tool) => (
              <li key={tool}>{tool.replaceAll('_', ' ')}</li>
            ))}
          </ul>
        )}
        <p className="muted">Las funciones completas de exportación/importación llegan en M12.</p>
      </section>
    </main>
  )
}
