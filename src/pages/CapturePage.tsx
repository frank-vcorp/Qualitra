import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { User } from '../types'
import { can } from '../types'

type PublishedForm = {
  id: string
  name: string
  description?: string | null
  record_type_name: string
  published_version_id: string
  form_version_number: number
}

type RecordRow = {
  id: string
  folio: string | null
  form_name: string
  status: string
  author_name: string
  updated_at: string
  created_at: string
}

export function CapturePage({ user }: { user: User }) {
  const [forms, setForms] = useState<PublishedForm[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const canCreate = can(user, 'create')

  async function load() {
    const [formsRes, recordsRes] = await Promise.all([
      api<{ forms: PublishedForm[] }>('/api/capture/forms'),
      api<{ records: RecordRow[] }>('/api/capture/records?mine=1'),
    ])
    setForms(formsRes.forms)
    setRecords(recordsRes.records)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar'))
  }, [])

  async function startCapture(formVersionId: string) {
    setError('')
    try {
      const res = await api<{ record: { id: string } }>('/api/capture/records', {
        method: 'POST',
        body: JSON.stringify({ formVersionId, data: {} }),
      })
      navigate(`/captura/registro/${res.record.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar captura')
    }
  }

  return (
    <main className="schema-page">
      <section className="card full schema-hero">
        <p className="eyebrow">M04 · Captura</p>
        <h2>Formularios y envíos</h2>
        <p className="lead">
          Elige un formulario publicado, llena los datos y guarda borrador o finaliza. Cada envío queda
          registrado con folio al finalizar.
        </p>
        {error && <p className="error banner-msg">{error}</p>}
      </section>

      <section className="card">
        <h3>Formularios disponibles</h3>
        {forms.length === 0 && (
          <p className="muted">
            No hay formularios publicados. Publica uno en <Link to="/formularios">Formularios</Link> o carga
            el demo.
          </p>
        )}
        <ul className="type-list">
          {forms.map((f) => (
            <li key={f.id}>
              <div className="type-card">
                <strong>{f.name}</strong>
                <span className="muted">{f.record_type_name} · v{f.form_version_number}</span>
                {canCreate && (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => startCapture(f.published_version_id)}
                  >
                    Nuevo envío
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card full">
        <h3>Mis envíos</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Formulario</th>
                <th>Estado</th>
                <th>Actualizado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.folio ?? '—'}</td>
                  <td>{r.form_name}</td>
                  <td>
                    <span className={`pill ${r.status}`}>{r.status}</span>
                  </td>
                  <td>{new Date(r.updated_at).toLocaleString('es-MX')}</td>
                  <td>
                    <Link to={`/captura/registro/${r.id}`} className="btn ghost small">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Sin envíos todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
