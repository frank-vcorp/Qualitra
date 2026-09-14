import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { FormPreview, type CaptureData } from '../components/FormPreview'
import type { User } from '../types'
import { can } from '../types'

type RecordDetail = {
  id: string
  folio: string | null
  status: string
  lock_version: number
  form_name: string
  form_version_id: string
  data: CaptureData & { calculated?: Record<string, unknown> }
  author_name: string
  created_at: string
  finalized_at?: string | null
}

type CaptureContext = {
  id: string
  form_name: string
  layout: {
    sections: Parameters<typeof FormPreview>[0]['sections']
    conditions: Parameters<typeof FormPreview>[0]['conditions']
    presentation?: Parameters<typeof FormPreview>[0]['presentation']
  }
  record_schema: Parameters<typeof FormPreview>[0]['schema']
}

export function RecordCapturePage({ user }: { user: User }) {
  const { recordId } = useParams()
  const navigate = useNavigate()
  const [record, setRecord] = useState<RecordDetail | null>(null)
  const [context, setContext] = useState<CaptureContext | null>(null)
  const [captureData, setCaptureData] = useState<CaptureData>({ fields: {}, groups: {} })
  const [calculated, setCalculated] = useState<Record<string, unknown>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const readOnly =
    record?.status === 'archived' ||
    (record?.status === 'finalized' && !can(user, 'edit'))

  const onDataChange = useCallback((data: CaptureData) => {
    setCaptureData(data)
  }, [])

  useEffect(() => {
    if (!recordId) return
    api<{ record: RecordDetail }>(`/api/capture/records/${recordId}`)
      .then(async (res) => {
        setRecord(res.record)
        setCaptureData({
          fields: res.record.data?.fields ?? {},
          groups: res.record.data?.groups ?? {},
        })
        setCalculated(res.record.data?.calculated ?? {})
        const ctx = await api<{ context: CaptureContext }>(
          `/api/capture/forms/${res.record.form_version_id}/context`,
        )
        setContext(ctx.context)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar'))
  }, [recordId])

  async function saveDraft() {
    if (!record) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await api<{
        record: RecordDetail
        calculations: { results: Record<string, unknown> }
      }>(`/api/capture/records/${record.id}`, {
        method: 'PUT',
        body: JSON.stringify({ data: captureData, lockVersion: record.lock_version }),
      })
      setRecord(res.record)
      setCalculated(res.calculations?.results ?? res.record.data?.calculated ?? {})
      setMessage('Borrador guardado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function finalize() {
    if (!record) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await api<{
        record: RecordDetail
        calculations: { results: Record<string, unknown> }
      }>(`/api/capture/records/${record.id}/finalize`, {
        method: 'POST',
        body: JSON.stringify({ data: captureData, lockVersion: record.lock_version }),
      })
      setRecord(res.record)
      setCalculated(res.calculations?.results ?? {})
      setMessage(`Finalizado — folio ${res.record.folio}`)
    } catch (err) {
      const e = err as Error & { details?: unknown }
      setError(e.message || 'No se pudo finalizar')
    } finally {
      setSaving(false)
    }
  }

  async function archiveRecord() {
    if (!record || !can(user, 'archive')) return
    await api(`/api/capture/records/${record.id}/archive`, { method: 'POST' })
    navigate('/captura')
  }

  if (!record || !context) {
    return (
      <main className="shell center">
        <p className="muted">{error || 'Cargando envío…'}</p>
      </main>
    )
  }

  const layout = context.layout ?? { sections: [], conditions: [] }

  return (
    <main className="schema-page">
      <section className="card full">
        <p className="eyebrow">
          <Link to="/captura">← Envíos</Link>
        </p>
        <h2>{context.form_name}</h2>
        <p className="muted">
          {record.folio ? `Folio ${record.folio}` : 'Borrador'} ·{' '}
          <span className={`pill ${record.status}`}>{record.status}</span> · {record.author_name}
        </p>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        <FormPreview
          sections={layout.sections ?? []}
          conditions={layout.conditions ?? []}
          schema={context.record_schema}
          presentation={layout.presentation ?? null}
          calculationResults={calculated}
          interactive={!readOnly}
          initialData={captureData}
          onDataChange={readOnly ? undefined : onDataChange}
        />

        {!readOnly && (
          <div className="editor-actions">
            <button type="button" className="btn" onClick={saveDraft} disabled={saving}>
              Guardar borrador
            </button>
            {can(user, 'create') && record.status === 'draft' && (
              <button type="button" className="btn primary" onClick={finalize} disabled={saving}>
                Finalizar envío
              </button>
            )}
          </div>
        )}

        {can(user, 'archive') && record.status === 'finalized' && (
          <button type="button" className="btn ghost danger-text" onClick={archiveRecord}>
            Archivar
          </button>
        )}
      </section>
    </main>
  )
}
