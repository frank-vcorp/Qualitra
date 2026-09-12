import { FormEvent, useEffect, useState } from 'react'
import { api } from '../api'
import { FormPreview } from '../components/FormPreview'

type RecordTypeOption = {
  recordTypeId: string
  recordTypeName: string
  versionId: string
  versionNumber: number
  fieldCount: number
}

type FormRow = {
  id: string
  name: string
  slug: string
  record_type_name: string
  versions: Array<{ id: string; version_number: number; status: string }>
}

type LayoutElement = {
  id: string
  type: string
  fieldKey?: string
  groupKey?: string
  label?: string
  help?: string
  required?: boolean
  text?: string
  content?: string
  template?: string
}

type Layout = {
  sections: Array<{ id: string; title: string; elements: LayoutElement[] }>
  conditions: Array<{
    id?: string
    targetFieldKey: string
    whenFieldKey: string
    operator?: string
    value: string
  }>
  presentation?: Record<string, unknown> | null
}

type FormVersion = {
  id: string
  version_number: number
  status: string
  layout: Layout
  record_schema: { fields?: unknown[]; groups?: unknown[]; calculations?: unknown[] }
  form_name: string
}

function uid() {
  return crypto.randomUUID()
}

export function FormsPage() {
  const [forms, setForms] = useState<FormRow[]>([])
  const [typeOptions, setTypeOptions] = useState<RecordTypeOption[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [version, setVersion] = useState<FormVersion | null>(null)
  const [layout, setLayout] = useState<Layout>({ sections: [], conditions: [], presentation: null })
  const [builderTab, setBuilderTab] = useState<'design' | 'conditions' | 'preview'>('design')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [previewCalc, setPreviewCalc] = useState<Record<string, unknown>>({})

  const [newFormName, setNewFormName] = useState('')
  const [newFormTypeVersion, setNewFormTypeVersion] = useState('')

  async function load() {
    const [formsRes, typesRes] = await Promise.all([
      api<{ forms: FormRow[] }>('/api/forms/forms'),
      api<{ options: RecordTypeOption[] }>('/api/forms/published-record-types'),
    ])
    setForms(formsRes.forms)
    setTypeOptions(typesRes.options)
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar'))
  }, [])

  async function openForm(formId: string) {
    setSelectedFormId(formId)
    setError('')
    const res = await api<{ form: FormRow & { versionDetails: FormVersion[] } }>(`/api/forms/forms/${formId}`)
    const draft = res.form.versionDetails.find((v) => v.status === 'draft')
    const pub = res.form.versionDetails.find((v) => v.status === 'published')
    const ver = draft ?? pub
    if (!ver) return
    await loadVersion(ver.id)
  }

  async function loadVersion(versionId: string) {
    const res = await api<{ version: FormVersion }>(`/api/forms/form-versions/${versionId}`)
    setVersion(res.version)
    setLayout(res.version.layout ?? { sections: [], conditions: [] })
    runPreviewCalc(versionId)
  }

  async function runPreviewCalc(versionId: string) {
    try {
      const res = await api<{ calculations: { results: Record<string, unknown> } }>(
        `/api/forms/form-versions/${versionId}/preview`,
        {
          method: 'POST',
          body: JSON.stringify({
            sampleData: {
              fields: { proveedor: 'prov-1', fecha: '2026-09-01' },
              groups: {
                criterios: [
                  { concepto: 'Calidad', calificacion: 95, peso: 0.5 },
                  { concepto: 'Entrega', calificacion: 92, peso: 0.5 },
                ],
              },
            },
          }),
        },
      )
      setPreviewCalc(res.calculations?.results ?? {})
    } catch {
      setPreviewCalc({})
    }
  }

  async function createForm(e: FormEvent) {
    e.preventDefault()
    if (!newFormName.trim() || !newFormTypeVersion) return
    setError('')
    try {
      const res = await api<{ form: { id: string } }>('/api/forms/forms', {
        method: 'POST',
        body: JSON.stringify({
          name: newFormName.trim(),
          recordTypeVersionId: newFormTypeVersion,
        }),
      })
      setNewFormName('')
      setMessage('Formulario creado — personaliza el diseño y publica')
      await load()
      await openForm(res.form.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear')
    }
  }

  async function saveLayout() {
    if (!version) return
    setSaving(true)
    setError('')
    try {
      await api(`/api/forms/form-versions/${version.id}`, {
        method: 'PUT',
        body: JSON.stringify({ layout }),
      })
      setMessage('Diseño guardado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function publishForm() {
    if (!version) return
    await saveLayout()
    setSaving(true)
    try {
      await api(`/api/forms/form-versions/${version.id}/publish`, { method: 'POST' })
      setMessage('Formulario publicado — listo para captura (M04)')
      await load()
      if (selectedFormId) await openForm(selectedFormId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar')
    } finally {
      setSaving(false)
    }
  }

  async function duplicateForm(formId: string) {
    try {
      const res = await api<{ form: { id: string } }>(`/api/forms/forms/${formId}/duplicate`, { method: 'POST' })
      await load()
      await openForm(res.form.id)
      setMessage('Copia creada')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al duplicar')
    }
  }

  async function seedDemoForm() {
    try {
      const res = await api<{ alreadyExists?: boolean }>('/api/forms/demo/evaluacion-form', { method: 'POST' })
      setMessage(res.alreadyExists ? 'El formulario demo ya existía' : 'Formulario demo cargado')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Carga primero el demo de Estructuras')
    }
  }

  function addSection() {
    setLayout((l) => ({
      ...l,
      sections: [...l.sections, { id: uid(), title: 'Nueva sección', elements: [] }],
    }))
  }

  function addElement(sectionId: string, element: LayoutElement) {
    setLayout((l) => ({
      ...l,
      sections: l.sections.map((s) =>
        s.id === sectionId ? { ...s, elements: [...s.elements, element] } : s,
      ),
    }))
  }

  function addCondition() {
    setLayout((l) => ({
      ...l,
      conditions: [
        ...l.conditions,
        { id: uid(), targetFieldKey: '', whenFieldKey: '', operator: 'equals', value: '' },
      ],
    }))
  }

  const schemaFields = (version?.record_schema?.fields ?? []) as Array<{
    key: string
    label: string
    type: string
    groupKey?: string
  }>

  return (
    <main className="schema-page">
      <section className="card full schema-hero">
        <p className="eyebrow">M03 · Formularios</p>
        <h2>Constructor de formularios</h2>
        <p className="lead">
          Aquí defines <strong>cómo se ve</strong> el mini formulario (secciones, orden, condiciones).
          La estructura de campos la creaste en <strong>Estructuras</strong>.
        </p>
        {message && <p className="success banner-msg">{message}</p>}
        {error && <p className="error banner-msg">{error}</p>}
        <button type="button" className="btn ghost" onClick={seedDemoForm}>
          Cargar formulario demo (Evaluación de proveedor)
        </button>
      </section>

      <div className="schema-layout">
        <section className="card schema-sidebar">
          <h3>Formularios</h3>
          <form onSubmit={createForm} className="stack compact">
            <input
              placeholder="Nombre (ej. Alta de dirección)"
              value={newFormName}
              onChange={(e) => setNewFormName(e.target.value)}
            />
            <select
              value={newFormTypeVersion}
              onChange={(e) => setNewFormTypeVersion(e.target.value)}
              required
            >
              <option value="">Basado en tipo publicado…</option>
              {typeOptions.map((o) => (
                <option key={o.versionId} value={o.versionId}>
                  {o.recordTypeName} v{o.versionNumber} ({o.fieldCount} campos)
                </option>
              ))}
            </select>
            <button type="submit" className="btn primary wide" disabled={typeOptions.length === 0}>
              + Nuevo formulario
            </button>
          </form>
          {typeOptions.length === 0 && (
            <p className="muted small-help">Publica un tipo en Estructuras para crear formularios.</p>
          )}
          <ul className="type-list">
            {forms.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className={`type-card ${selectedFormId === f.id ? 'selected' : ''}`}
                  onClick={() => openForm(f.id)}
                >
                  <strong>{f.name}</strong>
                  <span className="muted">{f.record_type_name}</span>
                  <div className="type-badges">
                    {f.versions.map((v) => (
                      <span key={v.id} className={`pill ${v.status}`}>
                        v{v.version_number} {v.status}
                      </span>
                    ))}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card schema-editor">
          {version ? (
            <>
              <div className="editor-head">
                <h3>
                  {version.form_name} · v{version.version_number}
                </h3>
                <span className={`pill ${version.status}`}>{version.status}</span>
              </div>

              <div className="schema-tabs">
                {(['design', 'conditions', 'preview'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`schema-tab ${builderTab === tab ? 'active' : ''}`}
                    onClick={() => setBuilderTab(tab)}
                  >
                    {tab === 'design' ? 'Diseño' : tab === 'conditions' ? 'Condiciones' : 'Vista previa'}
                  </button>
                ))}
              </div>

              {builderTab === 'design' && (
                <div className="stack">
                  <button type="button" className="btn ghost" onClick={addSection}>
                    + Agregar sección
                  </button>
                  {layout.sections.map((section) => (
                    <div key={section.id} className="field-card">
                      <label>
                        Título de sección
                        <input
                          value={section.title}
                          onChange={(e) =>
                            setLayout((l) => ({
                              ...l,
                              sections: l.sections.map((s) =>
                                s.id === section.id ? { ...s, title: e.target.value } : s,
                              ),
                            }))
                          }
                        />
                      </label>
                      <div className="inline-actions">
                        <select
                          id={`add-el-${section.id}`}
                          defaultValue=""
                          onChange={(e) => {
                            const v = e.target.value
                            if (!v) return
                            if (v === 'header') {
                              addElement(section.id, { id: uid(), type: 'header', text: 'Encabezado' })
                            } else if (v === 'text') {
                              addElement(section.id, {
                                id: uid(),
                                type: 'text',
                                content: 'Texto informativo para quien capture.',
                              })
                            } else if (v.startsWith('field:')) {
                              const key = v.slice(6)
                              const f = schemaFields.find((x) => x.key === key)
                              addElement(section.id, {
                                id: uid(),
                                type: 'field',
                                fieldKey: key,
                                label: f?.label ?? key,
                              })
                            } else if (v.startsWith('group:')) {
                              const key = v.slice(6)
                              addElement(section.id, { id: uid(), type: 'group', groupKey: key, label: key })
                            }
                            e.target.value = ''
                          }}
                        >
                          <option value="">Agregar elemento…</option>
                          <option value="header">Encabezado</option>
                          <option value="text">Texto informativo</option>
                          {schemaFields
                            .filter((f) => !f.groupKey && f.type !== 'calculated')
                            .map((f) => (
                              <option key={f.key} value={`field:${f.key}`}>
                                Campo: {f.label}
                              </option>
                            ))}
                          {(version.record_schema.groups as Array<{ key: string; label: string }>)?.map((g) => (
                            <option key={g.key} value={`group:${g.key}`}>
                              Grupo: {g.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <ul className="element-list">
                        {section.elements.map((el, idx) => (
                          <li key={el.id}>
                            <span className="pill draft">{el.type}</span>{' '}
                            {el.label || el.text || el.fieldKey || el.groupKey || el.content?.slice(0, 40)}
                            <button
                              type="button"
                              className="btn ghost small danger-text"
                              onClick={() =>
                                setLayout((l) => ({
                                  ...l,
                                  sections: l.sections.map((s) =>
                                    s.id === section.id
                                      ? { ...s, elements: s.elements.filter((_, i) => i !== idx) }
                                      : s,
                                  ),
                                }))
                              }
                            >
                              Quitar
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {builderTab === 'conditions' && (
                <div className="stack">
                  <p className="muted">Ejemplo: mostrar “Motivo de rechazo” solo si Resultado = RECHAZADO</p>
                  <button type="button" className="btn ghost" onClick={addCondition}>
                    + Agregar condición
                  </button>
                  {layout.conditions.map((c, idx) => (
                    <div key={c.id ?? idx} className="field-grid-3">
                      <label>
                        Mostrar campo
                        <select
                          value={c.targetFieldKey}
                          onChange={(e) =>
                            setLayout((l) => {
                              const conditions = [...l.conditions]
                              conditions[idx] = { ...conditions[idx], targetFieldKey: e.target.value }
                              return { ...l, conditions }
                            })
                          }
                        >
                          <option value="">—</option>
                          {schemaFields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Cuando
                        <select
                          value={c.whenFieldKey}
                          onChange={(e) =>
                            setLayout((l) => {
                              const conditions = [...l.conditions]
                              conditions[idx] = { ...conditions[idx], whenFieldKey: e.target.value }
                              return { ...l, conditions }
                            })
                          }
                        >
                          <option value="">—</option>
                          {schemaFields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Sea igual a
                        <input
                          value={c.value}
                          onChange={(e) =>
                            setLayout((l) => {
                              const conditions = [...l.conditions]
                              conditions[idx] = { ...conditions[idx], value: e.target.value }
                              return { ...l, conditions }
                            })
                          }
                          placeholder="RECHAZADO"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {builderTab === 'preview' && (
                <FormPreview
                  sections={layout.sections}
                  conditions={layout.conditions}
                  schema={{
                    fields: schemaFields,
                    groups: version.record_schema.groups as Array<{
                      key: string
                      label: string
                      repeatable?: boolean
                    }>,
                  }}
                  presentation={
                    layout.presentation as Record<
                      string,
                      {
                        title: string
                        scoreField: string
                        labelField: string
                        messages: Record<string, string>
                      }
                    > | null
                  }
                  calculationResults={previewCalc}
                />
              )}

              <div className="editor-actions">
                <button type="button" className="btn primary" onClick={saveLayout} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar diseño'}
                </button>
                {version.status === 'draft' && (
                  <button type="button" className="btn" onClick={publishForm} disabled={saving}>
                    Publicar formulario
                  </button>
                )}
                {selectedFormId && (
                  <button type="button" className="btn ghost" onClick={() => duplicateForm(selectedFormId)}>
                    Duplicar
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="editor-empty">
              <h3>Selecciona o crea un formulario</h3>
              <p className="lead">
                Elige un tipo publicado en Estructuras, ponle nombre y diseña cómo se verá al capturar.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
