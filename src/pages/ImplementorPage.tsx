import { useEffect, useState } from 'react'
import { api } from '../api'

export function ImplementorPage() {
  const [tools, setTools] = useState<string[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [expression, setExpression] = useState(
    'sum(criterios.calificacion * criterios.peso) / sum(criterios.peso)',
  )
  const [exprResult, setExprResult] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    api<{ tools: string[] }>('/api/demo/implementor-tools')
      .then((res) => setTools(res.tools))
      .catch((err) => setError(err instanceof Error ? err.message : 'Sin acceso'))
  }, [])

  async function exportConfig() {
    setError('')
    try {
      const payload = await api<Record<string, unknown>>('/api/schema/export')
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qualitra-m02-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('Configuración exportada')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Exportación fallida')
    }
  }

  async function importConfig(file: File) {
    setError('')
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      await api('/api/schema/import', { method: 'POST', body: JSON.stringify({ ...payload, merge: true }) })
      setMessage('Configuración importada (merge)')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Importación fallida')
    }
  }

  async function testExpression() {
    setError('')
    try {
      const res = await api<{ results: Record<string, unknown>; errors: unknown[] }>(
        '/api/schema/expressions/test',
        {
          method: 'POST',
          body: JSON.stringify({
            expression,
            sampleData: {
              fields: {},
              groups: {
                criterios: [
                  { calificacion: 90, peso: 0.5 },
                  { calificacion: 80, peso: 0.5 },
                ],
              },
            },
          }),
        },
      )
      setExprResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Expresión inválida')
    }
  }

  return (
    <main className="grid">
      <section className="card">
        <h2>Herramientas Implementador</h2>
        <p className="lead">Exportación, importación y prueba de expresiones (M02).</p>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        {!error && (
          <ul className="tool-list">
            {tools.map((tool) => (
              <li key={tool}>{tool.replaceAll('_', ' ')}</li>
            ))}
          </ul>
        )}
        <div className="inline-actions">
          <button type="button" className="btn primary" onClick={exportConfig}>
            Exportar tipos y catálogos
          </button>
          <label className="btn ghost file-btn">
            Importar (merge)
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importConfig(file)
              }}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Probar expresión</h2>
        <label>
          Expresión avanzada
          <textarea
            className="code-area"
            rows={4}
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
          />
        </label>
        <button type="button" className="btn" onClick={testExpression}>
          Ejecutar con datos simulados
        </button>
        {exprResult && <pre className="code-block">{JSON.stringify(exprResult, null, 2)}</pre>}
      </section>
    </main>
  )
}
