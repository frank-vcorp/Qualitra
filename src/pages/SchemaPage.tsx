import { FormEvent, useEffect, useState } from 'react'
import { api } from '../api'

type FieldDef = {
  key: string
  label: string
  type: string
  validations?: { requiredOnFinalize?: boolean; maxLength?: number }
  catalogSlug?: string
}

type Schema = {
  fields: FieldDef[]
  groups: unknown[]
  calculations: unknown[]
}

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
  schema: Schema
  type_name: string
}

const FIELD_TYPES = [
  { value: 'short_text', label: 'Texto corto' },
  { value: 'long_text', label: 'Texto largo' },
  { value: 'integer', label: 'Número entero' },
  { value: 'decimal', label: 'Número decimal' },
  { value: 'email', label: 'Correo electrónico' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'date', label: 'Fecha' },
  { value: 'boolean', label: 'Sí / No' },
  { value: 'select', label: 'Lista (catálogo)' },
]

const DIRECCION_TEMPLATE: FieldDef[] = [
  { key: 'calle', label: 'Calle', type: 'short_text', validations: { requiredOnFinalize: true } },
  { key: 'numero', label: 'Número', type: 'short_text', validations: { requiredOnFinalize: true } },
  { key: 'ciudad', label: 'Ciudad', type: 'short_text', validations: { requiredOnFinalize: true } },
  { key: 'municipio', label: 'Municipio', type: 'short_text' },
  { key: 'estado', label: 'Estado', type: 'short_text', validations: { requiredOnFinalize: true } },
  { key: 'pais', label: 'País', type: 'short_text', validations: { requiredOnFinalize: true } },
  { key: 'cp', label: 'Código postal', type: 'short_text', validations: { requiredOnFinalize: true, maxLength: 12 } },
]

function slugifyKey(label: string) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function emptyField(): FieldDef {
  return { key: '', label: '', type: 'short_text', validations: {} }
}

export function SchemaPage() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [activeTab, setActiveTab] = useState<'types' | 'catalogs'>('types')
  const [editorMode, setEditorMode] = useState<'new' | 'edit' | null>(null)
  const [typeName, setTypeName] = useState('')
  const [typeDescription, setTypeDescription] = useState('')
  const [fields, setFields] = useState<FieldDef[]>([])
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null)
  const [versionStatus, setVersionStatus] = useState<string>('draft')

  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null)
  const [newCatalogName, setNewCatalogName] = useState('')
  const [newOptionLabel, setNewOptionLabel] = useState('')

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
  }, [])

  function resetEditor() {
    setEditorMode(null)
    setTypeName('')
    setTypeDescription('')
    setFields([])
    setEditingTypeId(null)
    setEditingVersionId(null)
    setVersionStatus('draft')
  }

  function startNewType(template?: FieldDef[]) {
    setEditorMode('new')
    setTypeName(template ? 'Dirección' : '')
    setTypeDescription(template ? 'Domicilio postal completo' : '')
    setFields(template ? template.map((f) => ({ ...f })) : [emptyField()])
    setEditingTypeId(null)
    setEditingVersionId(null)
    setVersionStatus('draft')
    setActiveTab('types')
  }

  async function openEditor(recordType: RecordType) {
    setError('')
    setActiveTab('types')
    const detail = await api<{ recordType: RecordType & { versionDetails: VersionDetail[] } }>(
      `/api/schema/record-types/${recordType.id}`,
    )
    const draft = detail.recordType.versionDetails.find((v) => v.status === 'draft')
    const published = detail.recordType.versionDetails.find((v) => v.status === 'published')
    const version = draft ?? published
    if (!version) {
      setError('Este tipo no tiene versiones')
      return
    }
    const schema = version.schema ?? { fields: [], groups: [], calculations: [] }
    setEditorMode('edit')
    setTypeName(recordType.name)
    setTypeDescription(recordType.description ?? '')
    setFields(schema.fields?.length ? schema.fields.map((f) => ({ ...f })) : [emptyField()])
    setEditingTypeId(recordType.id)
    setEditingVersionId(version.id)
    setVersionStatus(version.status)
  }

  function updateField(index: number, patch: Partial<FieldDef>) {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f
        const next = { ...f, ...patch }
        if (patch.label !== undefined && (editorMode === 'new' || !f.key)) {
          next.key = slugifyKey(patch.label)
        }
        return next
      }),
    )
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= fields.length) return
    setFields((prev) => {
      const copy = [...prev]
      ;[copy[index], copy[target]] = [copy[target], copy[index]]
      return copy
    })
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  function addField() {
    setFields((prev) => [...prev, emptyField()])
  }

  async function saveRecordType(e: FormEvent) {
    e.preventDefault()
    if (!typeName.trim()) {
      setError('Escribe el nombre del tipo de registro')
      return
    }
    const validFields = fields.filter((f) => f.label.trim())
    if (validFields.length === 0) {
      setError('Agrega al menos un campo')
      return
    }
    for (const f of validFields) {
      if (!f.key) f.key = slugifyKey(f.label)
    }

    setSaving(true)
    setError('')
    setMessage('')
    const schema: Schema = { fields: validFields, groups: [], calculations: [] }

    try {
      if (editorMode === 'new') {
        const res = await api<{ recordType: RecordType & { draftVersion: { id: string } } }>(
          '/api/schema/record-types',
          {
            method: 'POST',
            body: JSON.stringify({ name: typeName.trim(), description: typeDescription.trim(), schema }),
          },
        )
        setMessage(`Tipo "${typeName}" creado. Puedes publicarlo cuando esté listo.`)
        setEditingTypeId(res.recordType.id)
        setEditingVersionId(res.recordType.draftVersion.id)
        setEditorMode('edit')
        setVersionStatus('draft')
      } else if (editingVersionId) {
        if (versionStatus === 'published') {
          const res = await api<{ version: { id: string } }>(
            `/api/schema/record-types/${editingTypeId}/versions`,
            { method: 'POST', body: JSON.stringify({ schema }) },
          )
          setEditingVersionId(res.version.id)
          setVersionStatus('draft')
          setMessage('Nueva versión en borrador — guardada')
        } else {
          await api(`/api/schema/record-type-versions/${editingVersionId}`, {
            method: 'PUT',
            body: JSON.stringify({ schema }),
          })
          setMessage('Cambios guardados')
        }
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function publishCurrent() {
    if (!editingVersionId || versionStatus !== 'draft') return
    setSaving(true)
    setError('')
    try {
      await api(`/api/schema/record-type-versions/${editingVersionId}/publish`, { method: 'POST' })
      setVersionStatus('published')
      setMessage('Versión publicada — ya puede usarse en formularios (M03)')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar')
    } finally {
      setSaving(false)
    }
  }

  async function seedDemo() {
    setError('')
    try {
      const res = await api<{ alreadyExists?: boolean }>('/api/schema/demo/seed', { method: 'POST' })
      setMessage(res.alreadyExists ? 'El caso demo ya existía' : 'Ejemplo cargado: Proveedor + Evaluación')
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
      setMessage('Catálogo creado — ahora agrega opciones')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear catálogo')
    }
  }

  async function addCatalogOption(catalogId: string) {
    if (!newOptionLabel.trim()) return
    setError('')
    const value = slugifyKey(newOptionLabel)
    try {
      await api(`/api/schema/catalogs/${catalogId}/options`, {
        method: 'POST',
        body: JSON.stringify({ value, label: newOptionLabel.trim() }),
      })
      setNewOptionLabel('')
      setMessage('Opción agregada')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar opción')
    }
  }

  const selectedCatalog = catalogs.find((c) => c.id === selectedCatalogId) ?? null

  return (
    <main className="schema-page">
      <section className="card full schema-hero">
        <p className="eyebrow">M02 · Estructuras</p>
        <h2>Tipos de registro y catálogos</h2>
        <p className="lead">
          Un <strong>tipo de registro</strong> es la plantilla con campos (ej. Dirección: calle, número, ciudad…).
          Un <strong>catálogo</strong> es solo una lista de opciones para desplegables (ej. países, estatus).
        </p>
        {message && <p className="success banner-msg">{message}</p>}
        {error && <p className="error banner-msg">{error}</p>}
      </section>

      <div className="schema-tabs">
        <button
          type="button"
          className={`schema-tab ${activeTab === 'types' ? 'active' : ''}`}
          onClick={() => setActiveTab('types')}
        >
          Tipos de registro
        </button>
        <button
          type="button"
          className={`schema-tab ${activeTab === 'catalogs' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalogs')}
        >
          Catálogos (listas)
        </button>
      </div>

      {activeTab === 'types' && (
        <div className="schema-layout">
          <section className="card schema-sidebar">
            <h3>Tus tipos</h3>
            <div className="stack compact">
              <button type="button" className="btn primary wide" onClick={() => startNewType()}>
                + Nuevo tipo de registro
              </button>
              <button type="button" className="btn wide" onClick={() => startNewType(DIRECCION_TEMPLATE)}>
                Plantilla: Dirección
              </button>
              <button type="button" className="btn ghost wide" onClick={seedDemo}>
                Cargar ejemplo avanzado
              </button>
            </div>
            <ul className="type-list">
              {recordTypes.map((rt) => {
                const published = rt.versions.find((v) => v.status === 'published')
                const draft = rt.versions.find((v) => v.status === 'draft')
                return (
                  <li key={rt.id}>
                    <button
                      type="button"
                      className={`type-card ${editingTypeId === rt.id ? 'selected' : ''}`}
                      onClick={() => openEditor(rt)}
                    >
                      <strong>{rt.name}</strong>
                      <span className="muted">{rt.versions.length} versión(es)</span>
                      <div className="type-badges">
                        {published && <span className="pill published">v{published.version_number} publicada</span>}
                        {draft && <span className="pill draft">v{draft.version_number} borrador</span>}
                      </div>
                    </button>
                  </li>
                )
              })}
              {recordTypes.length === 0 && (
                <li className="muted empty-hint">Aún no hay tipos. Crea uno o usa la plantilla Dirección.</li>
              )}
            </ul>
          </section>

          <section className="card schema-editor">
            {editorMode ? (
              <form onSubmit={saveRecordType} className="stack">
                <div className="editor-head">
                  <h3>{editorMode === 'new' ? 'Nuevo tipo de registro' : `Editar: ${typeName}`}</h3>
                  {versionStatus && (
                    <span className={`pill ${versionStatus}`}>
                      {versionStatus === 'draft' ? 'Borrador' : 'Publicada'}
                    </span>
                  )}
                </div>

                <div className="field-grid-2">
                  <label>
                    Nombre del tipo
                    <input
                      value={typeName}
                      onChange={(e) => setTypeName(e.target.value)}
                      placeholder="Ej. Dirección"
                      required
                      disabled={editorMode === 'edit'}
                    />
                  </label>
                  <label>
                    Descripción (opcional)
                    <input
                      value={typeDescription}
                      onChange={(e) => setTypeDescription(e.target.value)}
                      placeholder="Para qué sirve este tipo"
                    />
                  </label>
                </div>

                <div className="fields-section">
                  <div className="fields-section-head">
                    <h4>Campos</h4>
                    <button type="button" className="btn ghost" onClick={addField}>
                      + Agregar campo
                    </button>
                  </div>

                  {fields.length === 0 && (
                    <p className="muted">Sin campos — usa “Agregar campo” o la plantilla Dirección.</p>
                  )}

                  <div className="field-cards">
                    {fields.map((field, index) => (
                      <div key={index} className="field-card">
                        <div className="field-card-head">
                          <span className="field-num">{index + 1}</span>
                          <div className="field-card-actions">
                            <button type="button" className="btn ghost small" onClick={() => moveField(index, -1)} disabled={index === 0}>
                              ↑
                            </button>
                            <button
                              type="button"
                              className="btn ghost small"
                              onClick={() => moveField(index, 1)}
                              disabled={index === fields.length - 1}
                            >
                              ↓
                            </button>
                            <button type="button" className="btn ghost small danger-text" onClick={() => removeField(index)}>
                              Quitar
                            </button>
                          </div>
                        </div>
                        <div className="field-grid-3">
                          <label>
                            Etiqueta visible
                            <input
                              value={field.label}
                              onChange={(e) => updateField(index, { label: e.target.value })}
                              placeholder="Ej. Calle"
                              required
                            />
                          </label>
                          <label>
                            Tipo de dato
                            <select
                              value={field.type}
                              onChange={(e) => updateField(index, { type: e.target.value })}
                            >
                              {FIELD_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={Boolean(field.validations?.requiredOnFinalize)}
                              onChange={(e) =>
                                updateField(index, {
                                  validations: {
                                    ...field.validations,
                                    requiredOnFinalize: e.target.checked,
                                  },
                                })
                              }
                            />
                            Obligatorio al finalizar
                          </label>
                        </div>
                        {field.type === 'select' && (
                          <label>
                            Catálogo vinculado
                            <select
                              value={field.catalogSlug ?? ''}
                              onChange={(e) => updateField(index, { catalogSlug: e.target.value })}
                            >
                              <option value="">— Selecciona catálogo —</option>
                              {catalogs.map((c) => (
                                <option key={c.id} value={c.slug}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {field.key && <p className="muted field-key">Identificador interno: {field.key}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="preview-box">
                  <h4>Vista previa del formulario</h4>
                  <p className="muted">Así se verán los campos (la captura real llega en M03).</p>
                  <div className="preview-form">
                    {fields.filter((f) => f.label.trim()).map((field) => (
                      <label key={field.key || field.label} className="preview-field">
                        {field.label}
                        {field.validations?.requiredOnFinalize && <span className="req">*</span>}
                        {field.type === 'boolean' ? (
                          <select disabled>
                            <option>Sí / No</option>
                          </select>
                        ) : field.type === 'long_text' ? (
                          <textarea disabled rows={2} placeholder="…" />
                        ) : (
                          <input disabled placeholder="…" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="editor-actions">
                  <button type="submit" className="btn primary" disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  {versionStatus === 'draft' && editingVersionId && (
                    <button type="button" className="btn" onClick={publishCurrent} disabled={saving}>
                      Publicar versión
                    </button>
                  )}
                  {editorMode === 'edit' && (
                    <button type="button" className="btn ghost" onClick={resetEditor}>
                      Cerrar editor
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="editor-empty">
                <h3>Selecciona o crea un tipo</h3>
                <p className="lead">
                  Para <strong>Dirección</strong>, haz clic en <strong>“Plantilla: Dirección”</strong> a la
                  izquierda. Se cargarán calle, número, ciudad, estado, municipio, país y CP.
                </p>
                <p className="muted">
                  No uses “Catálogos” para esto — ahí solo van listas de opciones, no campos de domicilio.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'catalogs' && (
        <div className="schema-layout">
          <section className="card schema-sidebar">
            <h3>Catálogos</h3>
            <p className="muted small-help">
              Listas reutilizables para campos tipo “desplegable”, no estructuras con muchos campos.
            </p>
            <div className="inline-actions">
              <input
                placeholder="Nombre (ej. Países)"
                value={newCatalogName}
                onChange={(e) => setNewCatalogName(e.target.value)}
              />
              <button type="button" className="btn" onClick={createCatalog}>
                Crear
              </button>
            </div>
            <ul className="type-list">
              {catalogs.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    className={`type-card ${selectedCatalogId === cat.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCatalogId(cat.id)}
                  >
                    <strong>{cat.name}</strong>
                    <span className="muted">{cat.options.filter((o) => o.is_active).length} opciones</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card schema-editor">
            {selectedCatalog ? (
              <div className="stack">
                <h3>Opciones de “{selectedCatalog.name}”</h3>
                <p className="muted">Cada opción es una elección posible en un desplegable.</p>
                <ul className="option-list">
                  {selectedCatalog.options.map((opt) => (
                    <li key={opt.id} className={opt.is_active ? '' : 'inactive'}>
                      {opt.label}
                      {!opt.is_active && <span className="pill archived">inactiva</span>}
                    </li>
                  ))}
                  {selectedCatalog.options.length === 0 && (
                    <li className="muted">Sin opciones — agrega la primera abajo.</li>
                  )}
                </ul>
                <div className="inline-actions">
                  <input
                    placeholder="Nueva opción (ej. México)"
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCatalogOption(selectedCatalog.id)
                      }
                    }}
                  />
                  <button type="button" className="btn primary" onClick={() => addCatalogOption(selectedCatalog.id)}>
                    Agregar opción
                  </button>
                </div>
              </div>
            ) : (
              <div className="editor-empty">
                <h3>Selecciona un catálogo</h3>
                <p className="lead">O crea uno nuevo para usarlo en campos tipo “Lista (catálogo)”.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
