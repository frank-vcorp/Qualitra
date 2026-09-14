import { query, getPool } from './db.mjs'
import { getFormVersion } from './forms.mjs'
import { evaluateSchemaCalculations } from './expression-engine.mjs'
import { validateSampleData } from './schema-validation.mjs'

function folioPrefix(recordTypeName, recordTypeSlug) {
  const base = (recordTypeSlug ?? recordTypeName ?? 'RG')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase()
  return base || 'RG'
}

export async function nextFolio(recordTypeId, recordTypeName, recordTypeSlug) {
  const year = new Date().getFullYear()
  const prefix = folioPrefix(recordTypeName, recordTypeSlug)
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO record_folio_sequences (record_type_id, prefix, year, last_value)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (record_type_id, year)
       DO UPDATE SET last_value = record_folio_sequences.last_value + 1
       RETURNING last_value, prefix, year`,
      [recordTypeId, prefix, year],
    )
    await client.query('COMMIT')
    const row = rows[0]
    const seq = String(row.last_value).padStart(4, '0')
    return `${row.prefix}-${row.year}-${seq}`
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function listPublishedForms() {
  const { rows } = await query(
    `SELECT f.id, f.name, f.slug, f.description, rt.name AS record_type_name,
            fv.id AS published_version_id, fv.version_number AS form_version_number
     FROM forms f
     JOIN form_versions fv ON fv.form_id = f.id AND fv.status = 'published'
     JOIN record_types rt ON rt.id = f.record_type_id
     ORDER BY f.name`,
  )
  return rows
}

export async function getCaptureContext(formVersionId) {
  const fv = await getFormVersion(formVersionId)
  if (!fv) throw new Error('Formulario no encontrado')
  if (fv.status !== 'published') throw new Error('Sólo formularios publicados admiten captura')
  return fv
}

function buildPayload(schema, rawData, { finalize = false } = {}) {
  const sampleData = {
    fields: rawData?.fields ?? {},
    groups: rawData?.groups ?? {},
  }
  const validation = validateSampleData(schema, sampleData, { finalize })
  const calculations = evaluateSchemaCalculations(schema, sampleData)
  return {
    sampleData,
    validation,
    calculations,
    stored: {
      fields: sampleData.fields,
      groups: sampleData.groups,
      calculated: calculations.results ?? {},
    },
  }
}

export async function listRecords({ formId, status, createdBy, limit = 50 } = {}) {
  const clauses = []
  const params = []
  if (formId) {
    params.push(formId)
    clauses.push(`r.form_id = $${params.length}`)
  }
  if (status) {
    params.push(status)
    clauses.push(`r.status = $${params.length}`)
  }
  if (createdBy) {
    params.push(createdBy)
    clauses.push(`r.created_by = $${params.length}`)
  }
  params.push(limit)
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const { rows } = await query(
    `SELECT r.*, f.name AS form_name, u.name AS author_name, u.email AS author_email
     FROM records r
     JOIN forms f ON f.id = r.form_id
     JOIN users u ON u.id = r.created_by
     ${where}
     ORDER BY r.updated_at DESC
     LIMIT $${params.length}`,
    params,
  )
  return rows
}

export async function getRecord(id) {
  const { rows } = await query(
    `SELECT r.*, f.name AS form_name, fv.version_number AS form_version_number,
            rt.name AS record_type_name, rt.slug AS record_type_slug,
            u.name AS author_name, u.email AS author_email
     FROM records r
     JOIN forms f ON f.id = r.form_id
     JOIN form_versions fv ON fv.id = r.form_version_id
     JOIN record_types rt ON rt.id = r.record_type_id
     JOIN users u ON u.id = r.created_by
     WHERE r.id = $1`,
    [id],
  )
  return rows[0] ?? null
}

export async function createRecord({ formVersionId, userId, data = {} }) {
  const fv = await getCaptureContext(formVersionId)
  const { stored, validation, calculations } = buildPayload(fv.record_schema, data, { finalize: false })

  const { rows } = await query(
    `INSERT INTO records (
       form_id, form_version_id, record_type_id, record_type_version_id,
       status, data, created_by, updated_by
     ) VALUES ($1, $2, $3, $4, 'draft', $5::jsonb, $6, $6)
     RETURNING *`,
    [
      fv.form_id,
      fv.id,
      fv.record_type_id,
      fv.record_type_version_id,
      JSON.stringify(stored),
      userId,
    ],
  )
  return { record: rows[0], validation, calculations }
}

async function assertLock(recordId, lockVersion) {
  const record = await getRecord(recordId)
  if (!record) throw new Error('Registro no encontrado')
  if (lockVersion != null && Number(record.lock_version) !== Number(lockVersion)) {
    const err = new Error('Conflicto: el registro fue modificado en otra sesión')
    err.code = 'CONFLICT'
    throw err
  }
  return record
}

export async function saveRecord(recordId, userId, data, lockVersion) {
  const record = await assertLock(recordId, lockVersion)
  if (record.status === 'archived') throw new Error('No se puede editar un registro archivado')
  if (record.status === 'finalized') {
    const err = new Error('Registro finalizado — requiere permiso de edición')
    err.code = 'FINALIZED'
    throw err
  }

  const fv = await getFormVersion(record.form_version_id)
  const { stored, validation, calculations } = buildPayload(fv.record_schema, data, { finalize: false })

  const { rows } = await query(
    `UPDATE records
     SET data = $2::jsonb, updated_by = $3, updated_at = NOW(), lock_version = lock_version + 1
     WHERE id = $1
     RETURNING *`,
    [recordId, JSON.stringify(stored), userId],
  )
  return { record: rows[0], validation, calculations }
}

export async function finalizeRecord(recordId, userId, data, lockVersion) {
  const record = await assertLock(recordId, lockVersion)
  if (record.status === 'archived') throw new Error('No se puede finalizar un registro archivado')
  if (record.status === 'finalized') throw new Error('El registro ya está finalizado')

  const fv = await getFormVersion(record.form_version_id)
  const { stored, validation, calculations } = buildPayload(fv.record_schema, data, { finalize: true })
  if (!validation.ok) {
    const err = new Error('Validación fallida al finalizar')
    err.code = 'VALIDATION'
    err.details = validation.errors
    throw err
  }

  let folio = record.folio
  if (!folio) {
    folio = await nextFolio(fv.record_type_id, fv.record_type_name, fv.record_type_slug)
  }

  const { rows } = await query(
    `UPDATE records
     SET data = $2::jsonb, status = 'finalized', folio = $3,
         finalized_by = $4, finalized_at = NOW(),
         updated_by = $4, updated_at = NOW(), lock_version = lock_version + 1
     WHERE id = $1
     RETURNING *`,
    [recordId, JSON.stringify(stored), folio, userId],
  )
  return { record: rows[0], validation, calculations }
}

export async function archiveRecord(recordId, userId) {
  const { rows } = await query(
    `UPDATE records
     SET status = 'archived', archived_at = NOW(), updated_by = $2, updated_at = NOW(),
         lock_version = lock_version + 1
     WHERE id = $1 AND status != 'archived'
     RETURNING *`,
    [recordId, userId],
  )
  if (!rows[0]) throw new Error('Registro no encontrado o ya archivado')
  return rows[0]
}

export async function restoreRecord(recordId, userId) {
  const { rows } = await query(
    `UPDATE records
     SET status = 'finalized', archived_at = NULL, updated_by = $2, updated_at = NOW(),
         lock_version = lock_version + 1
     WHERE id = $1 AND status = 'archived'
     RETURNING *`,
    [recordId, userId],
  )
  if (!rows[0]) throw new Error('Registro no archivado')
  return rows[0]
}
