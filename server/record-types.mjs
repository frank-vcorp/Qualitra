import { query } from './db.mjs'
import { validateSchemaStructure } from './schema-validation.mjs'

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function listRecordTypes() {
  const { rows } = await query(
    `SELECT rt.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', v.id,
                  'version_number', v.version_number,
                  'status', v.status,
                  'published_at', v.published_at,
                  'created_at', v.created_at
                ) ORDER BY v.version_number DESC
              ) FILTER (WHERE v.id IS NOT NULL),
              '[]'
            ) AS versions
     FROM record_types rt
     LEFT JOIN record_type_versions v ON v.record_type_id = rt.id
     GROUP BY rt.id
     ORDER BY rt.name`,
  )
  return rows
}

export async function getRecordType(id) {
  const types = await listRecordTypes()
  const type = types.find((t) => t.id === id)
  if (!type) return null
  const { rows } = await query(
    `SELECT * FROM record_type_versions WHERE record_type_id = $1 ORDER BY version_number DESC`,
    [id],
  )
  return { ...type, versionDetails: rows }
}

export async function getRecordTypeVersion(versionId) {
  const { rows } = await query(
    `SELECT v.*, rt.slug AS type_slug, rt.name AS type_name
     FROM record_type_versions v
     JOIN record_types rt ON rt.id = v.record_type_id
     WHERE v.id = $1`,
    [versionId],
  )
  return rows[0] ?? null
}

export async function createRecordType({ name, slug, description, schema, createdBy }) {
  const finalSlug = slug?.trim() || slugify(name)
  const { schema: normalized, ok, errors } = validateSchemaStructure(schema ?? { fields: [], groups: [], calculations: [] })
  if (!ok) throw new Error(errors.join('; '))

  const { rows } = await query(
    `INSERT INTO record_types (slug, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [finalSlug, name.trim(), description?.trim() ?? null],
  )
  const type = rows[0]
  const version = await createDraftVersion(type.id, normalized, createdBy)
  return { ...type, draftVersion: version }
}

export async function createDraftVersion(recordTypeId, schema, createdBy) {
  const { rows: existing } = await query(
    `SELECT COALESCE(MAX(version_number), 0) AS max FROM record_type_versions WHERE record_type_id = $1`,
    [recordTypeId],
  )
  const nextVersion = Number(existing[0].max) + 1
  const { schema: normalized, ok, errors } = validateSchemaStructure(schema)
  if (!ok) throw new Error(errors.join('; '))

  const { rows } = await query(
    `INSERT INTO record_type_versions (record_type_id, version_number, status, schema, created_by)
     VALUES ($1, $2, 'draft', $3::jsonb, $4)
     RETURNING *`,
    [recordTypeId, nextVersion, JSON.stringify(normalized), createdBy ?? null],
  )
  return rows[0]
}

export async function updateDraftVersion(versionId, schema) {
  const version = await getRecordTypeVersion(versionId)
  if (!version) throw new Error('Versión no encontrada')
  if (version.status !== 'draft') throw new Error('Sólo se pueden editar borradores')

  const { schema: normalized, ok, errors } = validateSchemaStructure(schema)
  if (!ok) throw new Error(errors.join('; '))

  const { rows } = await query(
    `UPDATE record_type_versions SET schema = $2::jsonb WHERE id = $1 RETURNING *`,
    [versionId, JSON.stringify(normalized)],
  )
  await query('UPDATE record_types SET updated_at = NOW() WHERE id = $1', [version.record_type_id])
  return rows[0]
}

export async function publishVersion(versionId) {
  const version = await getRecordTypeVersion(versionId)
  if (!version) throw new Error('Versión no encontrada')
  if (version.status !== 'draft') throw new Error('Sólo se pueden publicar borradores')

  const { ok, errors } = validateSchemaStructure(version.schema)
  if (!ok) throw new Error(errors.join('; '))

  await query(
    `UPDATE record_type_versions
     SET status = 'archived'
     WHERE record_type_id = $1 AND status = 'published'`,
    [version.record_type_id],
  )

  const { rows } = await query(
    `UPDATE record_type_versions
     SET status = 'published', published_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [versionId],
  )
  await query('UPDATE record_types SET updated_at = NOW() WHERE id = $1', [version.record_type_id])
  return rows[0]
}

export async function exportConfiguration() {
  const catalogs = await query('SELECT * FROM catalogs ORDER BY name')
  const options = await query('SELECT * FROM catalog_options ORDER BY catalog_id, sort_order')
  const types = await listRecordTypes()
  const versions = await query('SELECT * FROM record_type_versions ORDER BY record_type_id, version_number')
  return {
    version: 'm02-1',
    exportedAt: new Date().toISOString(),
    catalogs: catalogs.rows,
    catalogOptions: options.rows,
    recordTypes: types,
    recordTypeVersions: versions.rows.map((v) => ({ ...v, schema: v.schema })),
  }
}

export async function importConfiguration(payload, { merge = false } = {}) {
  if (!merge) {
    await query('DELETE FROM record_type_versions')
    await query('DELETE FROM record_types')
    await query('DELETE FROM catalog_options')
    await query('DELETE FROM catalogs')
  }

  const catalogIdMap = new Map()
  for (const cat of payload.catalogs ?? []) {
    const { rows } = await query(
      `INSERT INTO catalogs (slug, name) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
       RETURNING id, slug`,
      [cat.slug, cat.name],
    )
    catalogIdMap.set(cat.id ?? cat.slug, rows[0].id)
  }

  for (const opt of payload.catalogOptions ?? []) {
    const catalogId = catalogIdMap.get(opt.catalog_id) ?? opt.catalog_id
    await query(
      `INSERT INTO catalog_options (catalog_id, value, label, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (catalog_id, value) DO UPDATE
         SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active`,
      [catalogId, opt.value, opt.label, opt.sort_order ?? 0, opt.is_active ?? true],
    )
  }

  const typeIdMap = new Map()
  for (const rt of payload.recordTypes ?? []) {
    const { rows } = await query(
      `INSERT INTO record_types (slug, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW()
       RETURNING id, slug`,
      [rt.slug, rt.name, rt.description ?? null],
    )
    typeIdMap.set(rt.id ?? rt.slug, rows[0].id)
  }

  for (const ver of payload.recordTypeVersions ?? []) {
    const recordTypeId = typeIdMap.get(ver.record_type_id) ?? ver.record_type_id
    await query(
      `INSERT INTO record_type_versions (record_type_id, version_number, status, schema, published_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (record_type_id, version_number) DO UPDATE
         SET status = EXCLUDED.status, schema = EXCLUDED.schema, published_at = EXCLUDED.published_at`,
      [
        recordTypeId,
        ver.version_number,
        ver.status,
        JSON.stringify(ver.schema ?? {}),
        ver.published_at ?? null,
      ],
    )
  }

  return exportConfiguration()
}
