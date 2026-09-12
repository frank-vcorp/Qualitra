import { useEffect, useState } from 'react'
import { api } from '../api'

type Catalog = {
  id: string
  slug: string
  name: string
  options: Array<{ id: string; value: string; label: string; is_active: boolean }>
}

type RecordType = {
  id: string
  slug: string
  name: string
  description?: string | null
  versions: Array<{ id: string; version_number: number; status: string; published_at?: string | null }>
}

type VersionDetail = {
  id: string
  record_type_id: string
  version_number: number
  status: string
  schema: Record<string, unknown>
  type_name: string
}

type Scenario = {
  name: string
  data: { fields: Record<string, unknown>; groups: Record<string, unknown[]> }
  expected: Record<string, string>
}

export function SchemaPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [versionDetail, setVersionDetail] = useState<VersionDetail | null>(null)
  const [sampleJson, setSampleJson] = useState('')
  const [simulation, setSimulation] = useState<Record<string, unknown> | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [newCatalogName, setNewCatalogName] = useState('')

  async function load() {
    const [catRes, typeRes] = await Promise.all([
      api<{ catalogs: Catalog[] }>('/api/schema/catalogs'),
      api<{ recordTypes: RecordType[] }>('/api/schema/record-types'),
    ])
    setCatalogs(catRes.catalogs)
    setRecordTypes(typeRes.recordTypes)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar'))
    api<{ scenarios: Scenario[] }>('/api/schema/demo/scenarios')
      .then((res) => setScenarios(res.scenarios))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedVersionId) {
      setVersionDetail(null)
      return
    }
    api<{ version: VersionDetail }>(`/api/schema/record-type-versions/${selectedVersionId}`)
      .then((res) => {
        setVersionDetail(res.version)
        if (!sampleJson) {
          setSampleJson(
            JSON.stringify(
              {
                fields: { proveedor: 'prov-1', fecha: '2026-09-01' },
                groups: {
                  criterios: [
                    { concepto: 'Calidad', calificacion: 95, peso: 0.5, observacion: '' },
                    { concepto: 'Entrega', calificacion: 92, peso: 0.5, observacion: '' },
                  ],
                },
              },
              null,
              2,
            ),
          )
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar versión'))
  }, [selectedVersionId])

  async function seedDemo() {
    setError('')
    setMessage('')
    try {
      const res = await api<{ alreadyExists?: boolean }>('/api/schema/demo/seed', { method: 'POST' })
      setMessage(res.alreadyExists ? 'El caso demo ya existía' : 'Caso demo cargado: Proveedor + Evaluación')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar demo')
    }
  }

  async function createCatalog() {
    if (!newCatalogName.trim()) return
    setError('')
    try {
      await api('/api/schema/catalogs', {
        method: 'POST',
        body: JSON.stringify({ name: newCatalogName.trim() }),
      })
      setNewCatalogName('')
      await load()
      setMessage('Catálogo creado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear catálogo')
    }
  }

  async function runSimulation(finalize = false) {
    if (!selectedVersionId) return
    setError('')
    try {
      const sampleData = JSON.parse(sampleJson)
      const res = await api<{ validation: unknown; calculations: unknown }>(
        `/api/schema/record-type-versions/${selectedVersionId}/simulate`,
        { method: 'POST', body: JSON.stringify({ sampleData, finalize }) },
      )
      setSimulation(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulación fallida')
    }
  }

  async function publishDraft() {
    if (!selectedVersionId || versionDetail?.status !== 'draft') return
    setError('')
    try {
      await api(`/api/schema/record-type-versions/${selectedVersionId}/publish`, { method: 'POST' })
      setMessage('Versión publicada')
      await load()
      const refreshed = await api<{ version: VersionDetail }>(
        `/api/schema/record-type-versions/${selectedVersionId}`,
      )
      setVersionDetail(refreshed.version)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar')
    }
  }

  async function createDraftFromPublished() {
    if (!versionDetail) return
    setError('')
    try {
      const res = await api<{ version: { id: string } }>(
        `/api/schema/record-types/${versionDetail.record_type_id}/versions`,
        { method: 'POST', body: JSON.stringify({ schema: versionDetail.schema }) },
      )
      setSelectedVersionId(res.version.id)
      setMessage('Nuevo borrador creado desde versión publicada')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear borrador')
    }
  }

  function applyScenario(scenario: Scenario) {
    setSampleJson(JSON.stringify(scenario.data, null, 2))
  }

  return (
    <main className="grid">
      <section className="card full">
        <h2>Tipos de registro y catálogos (M02)</h2>
        <p className="lead">
          Define estructuras de información, catálogos reutilizables y cálculos con expresiones seguras.
        </p>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <div className="inline-actions">
          <button type="button" className="btn primary" onClick={seedDemo}>
            Cargar caso demo (Proveedor + Evaluación)
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Catálogos</h2>
        <ul className="tool-list">
          {catalogs.map((cat) => (
            <li key={cat.id}>
              <strong>{cat.name}</strong>{' '}
              <span className="muted">
                ({cat.options.filter((o) => o.is_active).length} opciones activas)
              </span>
            </li>
          ))}
          {catalogs.length === 0 && <li className="muted">Sin catálogos — usa el caso demo o crea uno.</li>}
        </ul>
        <div className="inline-actions">
          <input
            placeholder="Nombre del catálogo"
            value={newCatalogName}
            onChange={(e) => setNewCatalogName(e.target.value)}
          />
          <button type="button" className="btn" onClick={createCatalog}>
            Crear catálogo
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Tipos de registro</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Versiones</th>
                <th>Simular</th>
              </tr>
            </thead>
            <tbody>
              {recordTypes.map((rt) => (
                <tr key={rt.id}>
                  <td>
                    <strong>{rt.name}</strong>
                    <div className="muted">{rt.slug}</div>
                  </td>
                  <td>
                    {rt.versions.map((v) => (
                      <span key={v.id} className={`pill ${v.status}`}>
                        v{v.version_number} · {v.status}
                      </span>
                    ))}
                  </td>
                  <td>
                    {rt.versions.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className="btn ghost small"
                        onClick={() => setSelectedVersionId(v.id)}
                      >
                        v{v.version_number}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {versionDetail && (
        <section className="card full">
          <h2>
            Simulador — {versionDetail.type_name} v{versionDetail.version_number}{' '}
            <span className={`pill ${versionDetail.status}`}>{versionDetail.status}</span>
          </h2>
          <div className="inline-actions">
            {versionDetail.status === 'draft' && (
              <button type="button" className="btn primary" onClick={publishDraft}>
                Publicar versión
              </button>
            )}
            {versionDetail.status === 'published' && (
              <button type="button" className="btn" onClick={createDraftFromPublished}>
                Nueva versión (borrador)
              </button>
            )}
            {scenarios.length > 0 && (
              <>
                {scenarios.map((s) => (
                  <button key={s.name} type="button" className="btn ghost" onClick={() => applyScenario(s)}>
                    Escenario {s.name}
                  </button>
                ))}
              </>
            )}
          </div>
          <label>
            Datos de prueba (JSON)
            <textarea
              className="code-area"
              rows={12}
              value={sampleJson}
              onChange={(e) => setSampleJson(e.target.value)}
            />
          </label>
          <div className="inline-actions">
            <button type="button" className="btn" onClick={() => runSimulation(false)}>
              Simular borrador
            </button>
            <button type="button" className="btn primary" onClick={() => runSimulation(true)}>
              Validar finalización
            </button>
          </div>
          {simulation && (
            <pre className="code-block">{JSON.stringify(simulation, null, 2)}</pre>
          )}
        </section>
      )}
    </main>
  )
}
