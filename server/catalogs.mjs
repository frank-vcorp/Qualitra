import { query } from './db.mjs'

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function listCatalogs() {
  const { rows } = await query(
    `SELECT c.*,
            COALESCE(json_agg(
              json_build_object(
                'id', o.id,
                'value', o.value,
                'label', o.label,
                'sort_order', o.sort_order,
                'is_active', o.is_active
              ) ORDER BY o.sort_order, o.label
            ) FILTER (WHERE o.id IS NOT NULL), '[]') AS options
     FROM catalogs c
     LEFT JOIN catalog_options o ON o.catalog_id = c.id
     GROUP BY c.id
     ORDER BY c.name`,
  )
  return rows
}

export async function getCatalogById(id) {
  const catalogs = await listCatalogs()
  return catalogs.find((c) => c.id === id) ?? null
}

export async function createCatalog({ name, slug, options = [] }) {
  const finalSlug = slug?.trim() || slugify(name)
  const { rows } = await query(
    `INSERT INTO catalogs (slug, name) VALUES ($1, $2)
     RETURNING *`,
    [finalSlug, name.trim()],
  )
  const catalog = rows[0]
  for (const [index, opt] of options.entries()) {
    await addCatalogOption(catalog.id, { ...opt, sort_order: opt.sort_order ?? index })
  }
  return getCatalogById(catalog.id)
}

export async function addCatalogOption(catalogId, { value, label, sort_order = 0, is_active = true }) {
  const { rows } = await query(
    `INSERT INTO catalog_options (catalog_id, value, label, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [catalogId, value, label, sort_order, is_active],
  )
  await query('UPDATE catalogs SET updated_at = NOW() WHERE id = $1', [catalogId])
  return rows[0]
}

export async function updateCatalogOption(optionId, { label, sort_order, is_active }) {
  const { rows } = await query(
    `UPDATE catalog_options
     SET label = COALESCE($2, label),
         sort_order = COALESCE($3, sort_order),
         is_active = COALESCE($4, is_active)
     WHERE id = $1
     RETURNING *`,
    [optionId, label, sort_order, is_active],
  )
  if (rows[0]) {
    await query('UPDATE catalogs SET updated_at = NOW() WHERE id = $1', [rows[0].catalog_id])
  }
  return rows[0] ?? null
}

export async function reorderCatalogOptions(catalogId, orderedIds) {
  for (const [index, id] of orderedIds.entries()) {
    await query('UPDATE catalog_options SET sort_order = $1 WHERE id = $2 AND catalog_id = $3', [
      index,
      id,
      catalogId,
    ])
  }
  await query('UPDATE catalogs SET updated_at = NOW() WHERE id = $1', [catalogId])
  return getCatalogById(catalogId)
}
