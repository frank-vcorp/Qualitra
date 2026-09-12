import { createCatalog, listCatalogs } from './catalogs.mjs'
import { createRecordType, publishVersion } from './record-types.mjs'

const PROVEEDOR_SCHEMA = {
  fields: [
    { key: 'nombre', label: 'Nombre', type: 'short_text', validations: { requiredOnFinalize: true, maxLength: 200 } },
    { key: 'rfc', label: 'RFC', type: 'short_text', validations: { maxLength: 13 } },
    { key: 'correo', label: 'Correo', type: 'email' },
    { key: 'telefono', label: 'Teléfono', type: 'phone' },
    { key: 'activo', label: 'Activo', type: 'boolean', defaultValue: true },
  ],
  groups: [],
  calculations: [],
}

const CRITERIO_FIELDS = [
  {
    key: 'concepto',
    label: 'Concepto',
    type: 'short_text',
    groupKey: 'criterios',
    validations: { requiredOnFinalize: true },
  },
  {
    key: 'calificacion',
    label: 'Calificación',
    type: 'decimal',
    groupKey: 'criterios',
    validations: { min: 0, max: 100 },
  },
  { key: 'peso', label: 'Peso', type: 'decimal', groupKey: 'criterios', validations: { min: 0, max: 1 } },
  { key: 'observacion', label: 'Observación', type: 'long_text', groupKey: 'criterios' },
]

const EVALUACION_SCHEMA = {
  fields: [
    {
      key: 'proveedor',
      label: 'Proveedor',
      type: 'select',
      catalogSlug: 'proveedores-demo',
      validations: { requiredOnFinalize: true },
    },
    { key: 'fecha', label: 'Fecha', type: 'date', validations: { requiredOnFinalize: true } },
    ...CRITERIO_FIELDS,
    { key: 'calificacion_final', label: 'Calificación final', type: 'calculated' },
    { key: 'resultado', label: 'Resultado', type: 'calculated' },
  ],
  groups: [
    {
      key: 'criterios',
      label: 'Criterio',
      repeatable: true,
      minItems: 1,
      maxItems: 20,
      fields: ['concepto', 'calificacion', 'peso', 'observacion'],
    },
  ],
  calculations: [
    {
      key: 'calificacion_final',
      label: 'Calificación final',
      expression: 'sum(criterios.calificacion * criterios.peso) / sum(criterios.peso)',
    },
    {
      key: 'resultado',
      label: 'Resultado',
      expression: "if(calificacion_final >= 90, 'APROBADO', if(calificacion_final >= 70, 'A PRUEBA', 'RECHAZADO'))",
    },
  ],
}

export function getDemoScenarios() {
  return [
    {
      name: 'APROBADO',
      data: {
        fields: { proveedor: 'prov-1', fecha: '2026-09-01' },
        groups: {
          criterios: [
            { concepto: 'Calidad', calificacion: 95, peso: 0.5, observacion: '' },
            { concepto: 'Entrega', calificacion: 92, peso: 0.5, observacion: '' },
          ],
        },
      },
      expected: { resultado: 'APROBADO' },
    },
    {
      name: 'A PRUEBA',
      data: {
        fields: { proveedor: 'prov-1', fecha: '2026-09-01' },
        groups: {
          criterios: [
            { concepto: 'Calidad', calificacion: 75, peso: 0.5, observacion: '' },
            { concepto: 'Entrega', calificacion: 78, peso: 0.5, observacion: '' },
          ],
        },
      },
      expected: { resultado: 'A PRUEBA' },
    },
    {
      name: 'RECHAZADO',
      data: {
        fields: { proveedor: 'prov-1', fecha: '2026-09-01' },
        groups: {
          criterios: [
            { concepto: 'Calidad', calificacion: 60, peso: 0.5, observacion: '' },
            { concepto: 'Entrega', calificacion: 55, peso: 0.5, observacion: '' },
          ],
        },
      },
      expected: { resultado: 'RECHAZADO' },
    },
  ]
}

export async function seedDemoCase(createdBy) {
  const existing = await listCatalogs()
  if (existing.some((c) => c.slug === 'proveedores-demo')) {
    return { alreadyExists: true }
  }

  await createCatalog({
    name: 'Proveedores demo',
    slug: 'proveedores-demo',
    options: [
      { value: 'prov-1', label: 'Proveedor Alfa' },
      { value: 'prov-2', label: 'Proveedor Beta' },
    ],
  })

  const proveedor = await createRecordType({
    name: 'Proveedor',
    slug: 'proveedor',
    description: 'Catálogo de proveedores (caso M02)',
    schema: PROVEEDOR_SCHEMA,
    createdBy,
  })
  await publishVersion(proveedor.draftVersion.id)

  const evaluacion = await createRecordType({
    name: 'Evaluación de proveedor',
    slug: 'evaluacion-proveedor',
    description: 'Evaluación con criterios repetibles y cálculo ponderado',
    schema: EVALUACION_SCHEMA,
    createdBy,
  })
  await publishVersion(evaluacion.draftVersion.id)

  return { proveedor, evaluacion, scenarios: getDemoScenarios() }
}
