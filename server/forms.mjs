import crypto from 'node:crypto'
import { query } from './db.mjs'
import { getRecordTypeVersion } from './record-types.mjs'
import { normalizeLayout, validateConditions } from './form-conditions.mjs'
import { evaluateSchemaCalculations } from './expression-engine.mjs'

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function collectFieldKeys(schema) {
  const keys = new Set((schema?.fields ?? []).map((f) => f.key))
  for (const calc of schema?.calculations ?? []) keys.add(calc.key)
  return keys
}

export function validateFormLayout(layoutInput, schema) {
  const layout = normalizeLayout(layoutInput)
  const fieldKeys = collectFieldKeys(schema)
  const { ok, errors } = validateConditions(layout.conditions, fieldKeys)
  return { ok, errors, layout }
}

export async function listForms() {
  const { rows } = await query(
    `SELECT f.*, rt.name AS record_type_name,
            COALESCE(json_agg(
              json_build_object(
                'id', v.id,
                'version_number', v.version_number,
                'status', v.status,
                'published_at', v.published_at
              ) ORDER BY v.version_number DESC
            ) FILTER (WHERE v.id IS NOT NULL), '[]') AS versions
     FROM forms f
     JOIN record_types rt ON rt.id = f.record_type_id
     LEFT JOIN form_versions v ON v.form_id = f.id
     GROUP BY f.id, rt.name
     ORDER BY f.name`,
  )
  return rows
}

export async function getForm(id) {
  const forms = await listForms()
  const form = forms.find((f) => f.id === id)
  if (!form) return null
  const { rows } = await query(
    `SELECT fv.*, f.record_type_version_id
     FROM form_versions fv
     JOIN forms f ON f.id = fv.form_id
     WHERE fv.form_id = $1
     ORDER BY fv.version_number DESC`,
    [id],
  )
  return { ...form, versionDetails: rows }
}

export async function getFormVersion(versionId) {
  const { rows } = await query(
    `SELECT fv.*, f.name AS form_name, f.slug AS form_slug,
            f.record_type_id, f.record_type_version_id,
            rt.name AS record_type_name, rt.slug AS record_type_slug,
            rtv.schema AS record_schema
     FROM form_versions fv
     JOIN forms f ON f.id = fv.form_id
     JOIN record_types rt ON rt.id = f.record_type_id
     JOIN record_type_versions rtv ON rtv.id = f.record_type_version_id
     WHERE fv.id = $1`,
    [versionId],
  )
  return rows[0] ?? null
}

export async function createForm({ name, description, recordTypeVersionId, createdBy }) {
  const rtv = await getRecordTypeVersion(recordTypeVersionId)
  if (!rtv) throw new Error('Versión de tipo no encontrada')
  if (rtv.status !== 'published') throw new Error('El formulario debe basarse en un tipo publicado')

  const slug = slugify(name)
  const defaultLayout = buildDefaultLayout(rtv.schema)

  const { rows } = await query(
    `INSERT INTO forms (slug, name, description, record_type_id, record_type_version_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [slug, name.trim(), description?.trim() ?? null, rtv.record_type_id, recordTypeVersionId],
  )
  const form = rows[0]
  const version = await createFormDraftVersion(form.id, defaultLayout, createdBy)
  return { ...form, draftVersion: version }
}

function buildDefaultLayout(schema) {
  const elements = (schema?.fields ?? [])
    .filter((f) => f.type !== 'calculated' && !f.groupKey)
    .map((f) => ({
      id: crypto.randomUUID(),
      type: 'field',
      fieldKey: f.key,
      label: f.label,
      help: '',
      required: Boolean(f.validations?.requiredOnFinalize),
    }))

  for (const group of schema?.groups ?? []) {
    elements.push({
      id: crypto.randomUUID(),
      type: 'group',
      groupKey: group.key,
      label: group.label,
    })
  }

  for (const calc of schema?.calculations ?? []) {
    elements.push({
      id: crypto.randomUUID(),
      type: 'calculated',
      fieldKey: calc.key,
      label: calc.label ?? calc.key,
    })
  }

  return normalizeLayout({
    sections: [{ id: crypto.randomUUID(), type: 'section', title: 'General', elements }],
    conditions: [],
    presentation: null,
  })
}

export async function createFormDraftVersion(formId, layout, createdBy) {
  const { rows: existing } = await query(
    `SELECT COALESCE(MAX(version_number), 0) AS max FROM form_versions WHERE form_id = $1`,
    [formId],
  )
  const next = Number(existing[0].max) + 1
  const { rows } = await query(
    `INSERT INTO form_versions (form_id, version_number, status, layout, created_by)
     VALUES ($1, $2, 'draft', $3::jsonb, $4)
     RETURNING *`,
    [formId, next, JSON.stringify(normalizeLayout(layout)), createdBy ?? null],
  )
  return rows[0]
}

export async function updateFormDraftVersion(versionId, layout) {
  const version = await getFormVersion(versionId)
  if (!version) throw new Error('Versión de formulario no encontrada')
  if (version.status !== 'draft') throw new Error('Sólo se pueden editar borradores')

  const { ok, errors, layout: normalized } = validateFormLayout(layout, version.record_schema)
  if (!ok) throw new Error(errors.join('; '))

  const { rows } = await query(
    `UPDATE form_versions SET layout = $2::jsonb WHERE id = $1 RETURNING *`,
    [versionId, JSON.stringify(normalized)],
  )
  await query('UPDATE forms SET updated_at = NOW() WHERE id = $1', [version.form_id])
  return rows[0]
}

export async function publishFormVersion(versionId) {
  const version = await getFormVersion(versionId)
  if (!version) throw new Error('Versión no encontrada')
  if (version.status !== 'draft') throw new Error('Sólo se pueden publicar borradores')

  const { ok, errors } = validateFormLayout(version.layout, version.record_schema)
  if (!ok) throw new Error(errors.join('; '))

  await query(
    `UPDATE form_versions SET status = 'archived'
     WHERE form_id = $1 AND status = 'published'`,
    [version.form_id],
  )

  const { rows } = await query(
    `UPDATE form_versions SET status = 'published', published_at = NOW()
     WHERE id = $1 RETURNING *`,
    [versionId],
  )
  return rows[0]
}

export async function withdrawFormVersion(versionId) {
  const { rows } = await query(
    `UPDATE form_versions SET status = 'withdrawn'
     WHERE id = $1 AND status = 'published'
     RETURNING *`,
    [versionId],
  )
  if (!rows[0]) throw new Error('Sólo se pueden retirar versiones publicadas')
  return rows[0]
}

export async function duplicateForm(formId, createdBy) {
  const form = await getForm(formId)
  if (!form) throw new Error('Formulario no encontrado')
  const latest = form.versionDetails[0]
  const { rows } = await query(
    `INSERT INTO forms (slug, name, description, record_type_id, record_type_version_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      `${form.slug}-copia-${Date.now()}`,
      `${form.name} (copia)`,
      form.description,
      form.record_type_id,
      form.record_type_version_id,
    ],
  )
  const copy = rows[0]
  const version = await createFormDraftVersion(copy.id, latest.layout, createdBy)
  return { ...copy, draftVersion: version }
}

export async function addFieldToTypeFromForm(recordTypeVersionId, field, createdBy) {
  const rtv = await getRecordTypeVersion(recordTypeVersionId)
  if (!rtv) throw new Error('Versión de tipo no encontrada')
  if (rtv.status !== 'published') {
    throw new Error('Para añadir campos, crea primero un borrador del tipo')
  }
  const { createDraftVersion } = await import('./record-types.mjs')
  const schema = rtv.schema ?? { fields: [], groups: [], calculations: [] }
  if (schema.fields.some((f) => f.key === field.key)) {
    throw new Error('Ya existe un campo con esa clave')
  }
  schema.fields.push(field)
  return createDraftVersion(rtv.record_type_id, schema, createdBy)
}

export function exportFormContext(formVersion) {
  const schema = formVersion.record_schema ?? {}
  return {
    version: 'm03-1',
    exportedAt: new Date().toISOString(),
    form: {
      id: formVersion.form_id,
      name: formVersion.form_name,
      versionNumber: formVersion.version_number,
      status: formVersion.status,
    },
    recordType: {
      id: formVersion.record_type_id,
      versionId: formVersion.record_type_version_id,
      name: formVersion.record_type_name,
    },
    layout: formVersion.layout,
    fields: schema.fields ?? [],
    groups: schema.groups ?? [],
    calculations: schema.calculations ?? [],
    sampleDataHint: {
      fields: {},
      groups: {},
    },
  }
}

export function previewForm(formVersion, sampleData) {
  const schema = formVersion.record_schema ?? {}
  const layout = normalizeLayout(formVersion.layout)
  const validation = { fields: sampleData?.fields ?? {}, groups: sampleData?.groups ?? {} }
  const calculations = evaluateSchemaCalculations(schema, sampleData ?? {})
  return { layout, calculations, sampleData: validation }
}
