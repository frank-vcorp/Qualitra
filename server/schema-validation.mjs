const FIELD_TYPES = new Set([
  'short_text',
  'long_text',
  'integer',
  'decimal',
  'currency',
  'percent',
  'date',
  'datetime',
  'time',
  'email',
  'phone',
  'url',
  'boolean',
  'select',
  'multi_select',
  'options',
  'checkbox',
  'user_ref',
  'calculated',
  'compound_group',
  'repeatable_group',
  'structured_table',
])

export function normalizeSchema(input) {
  const schema = input ?? {}
  return {
    fields: Array.isArray(schema.fields) ? schema.fields : [],
    groups: Array.isArray(schema.groups) ? schema.groups : [],
    calculations: Array.isArray(schema.calculations) ? schema.calculations : [],
  }
}

export function validateSchemaStructure(schemaInput) {
  const schema = normalizeSchema(schemaInput)
  const errors = []
  const keys = new Set()

  for (const field of schema.fields) {
    if (!field.key || !field.label || !field.type) {
      errors.push('Cada campo requiere key, label y type')
      continue
    }
    if (keys.has(field.key)) errors.push(`Clave duplicada: ${field.key}`)
    keys.add(field.key)
    if (!FIELD_TYPES.has(field.type)) {
      errors.push(`Tipo no soportado: ${field.type}`)
    }
  }

  for (const group of schema.groups) {
    if (!group.key || !group.label) {
      errors.push('Cada grupo requiere key y label')
    }
    if (group.repeatable && group.minItems != null && group.maxItems != null) {
      if (group.minItems > group.maxItems) {
        errors.push(`Grupo ${group.key}: minItems no puede exceder maxItems`)
      }
    }
  }

  for (const calc of schema.calculations) {
    if (!calc.key || !calc.expression) {
      errors.push('Cada cálculo requiere key y expression')
    }
  }

  return { ok: errors.length === 0, errors, schema }
}

export function validateSampleData(schemaInput, sampleData, { finalize = false } = {}) {
  const { schema } = validateSchemaStructure(schemaInput)
  const errors = []
  const fields = sampleData?.fields ?? {}
  const groups = sampleData?.groups ?? {}

  for (const field of schema.fields) {
    if (field.type === 'calculated') continue
    const value = fields[field.key]
    const v = field.validations ?? {}

    if (finalize && v.requiredOnFinalize && (value === undefined || value === null || value === '')) {
      errors.push({ field: field.key, message: v.message || `${field.label} es obligatorio al finalizar` })
    }

    if (value == null || value === '') continue

    if (field.type === 'integer' && !Number.isInteger(Number(value))) {
      errors.push({ field: field.key, message: 'Debe ser entero' })
    }
    if (['decimal', 'currency', 'percent'].includes(field.type) && Number.isNaN(Number(value))) {
      errors.push({ field: field.key, message: 'Debe ser numérico' })
    }
    if (v.min != null && Number(value) < v.min) {
      errors.push({ field: field.key, message: `Mínimo ${v.min}` })
    }
    if (v.max != null && Number(value) > v.max) {
      errors.push({ field: field.key, message: `Máximo ${v.max}` })
    }
    if (v.maxLength != null && String(value).length > v.maxLength) {
      errors.push({ field: field.key, message: `Longitud máxima ${v.maxLength}` })
    }
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      errors.push({ field: field.key, message: 'Correo inválido' })
    }
  }

  for (const group of schema.groups.filter((g) => g.repeatable)) {
    const rows = groups[group.key] ?? []
    if (finalize && group.minItems != null && rows.length < group.minItems) {
      errors.push({ field: group.key, message: `Mínimo ${group.minItems} elementos en ${group.label}` })
    }
    if (group.maxItems != null && rows.length > group.maxItems) {
      errors.push({ field: group.key, message: `Máximo ${group.maxItems} elementos en ${group.label}` })
    }
  }

  return { ok: errors.length === 0, errors }
}

export { FIELD_TYPES }
