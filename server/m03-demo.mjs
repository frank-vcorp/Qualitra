import crypto from 'node:crypto'
import { query } from './db.mjs'
import { listRecordTypes, getRecordTypeVersion, createDraftVersion, publishVersion } from './record-types.mjs'
import { createForm, getForm } from './forms.mjs'
import { normalizeLayout } from './form-conditions.mjs'

export async function seedEvaluacionForm(createdBy) {
  const types = await listRecordTypes()
  const evalType = types.find((t) => t.slug === 'evaluacion-proveedor')
  if (!evalType) {
    throw new Error('Primero carga el caso demo de Estructuras (Evaluación de proveedor)')
  }
  let published = evalType.versions.find((v) => v.status === 'published')
  if (!published) throw new Error('Publica la versión del tipo Evaluación de proveedor')

  let rtv = await getRecordTypeVersion(published.id)
  if (!rtv.schema?.fields?.some((f) => f.key === 'motivo_rechazo')) {
    const schema = {
      ...rtv.schema,
      fields: [
        ...(rtv.schema?.fields ?? []),
        {
          key: 'motivo_rechazo',
          label: 'Motivo de rechazo',
          type: 'long_text',
          validations: { requiredOnFinalize: true },
        },
      ],
    }
    const draft = await createDraftVersion(evalType.id, schema, createdBy)
    published = await publishVersion(draft.id)
    rtv = await getRecordTypeVersion(published.id)
  }

  const { rows: existing } = await query(
    `SELECT id FROM forms WHERE slug = 'evaluacion-proveedor-form' LIMIT 1`,
  )
  if (existing[0]) {
    return { alreadyExists: true, form: await getForm(existing[0].id) }
  }

  const layout = normalizeLayout({
    sections: [
      {
        id: crypto.randomUUID(),
        type: 'section',
        title: 'Datos de la evaluación',
        elements: [
          { id: crypto.randomUUID(), type: 'header', text: 'Evaluación de proveedor' },
          {
            id: crypto.randomUUID(),
            type: 'text',
            content: 'Complete los criterios y el sistema calculará el resultado automáticamente.',
          },
          { id: crypto.randomUUID(), type: 'field', fieldKey: 'proveedor', label: 'Proveedor', required: true },
          { id: crypto.randomUUID(), type: 'field', fieldKey: 'fecha', label: 'Fecha de evaluación', required: true },
          { id: crypto.randomUUID(), type: 'group', groupKey: 'criterios', label: 'Criterios de evaluación' },
        ],
      },
      {
        id: crypto.randomUUID(),
        type: 'section',
        title: 'Resultado',
        elements: [
          { id: crypto.randomUUID(), type: 'calculated', fieldKey: 'calificacion_final', label: 'Calificación final' },
          { id: crypto.randomUUID(), type: 'calculated', fieldKey: 'resultado', label: 'Clasificación' },
          {
            id: crypto.randomUUID(),
            type: 'presentation',
            template: 'resultado_evaluacion',
          },
          {
            id: crypto.randomUUID(),
            type: 'field',
            fieldKey: 'motivo_rechazo',
            label: 'Motivo de rechazo',
            help: 'Obligatorio cuando el resultado es RECHAZADO',
            required: true,
          },
        ],
      },
    ],
    conditions: [
      {
        id: crypto.randomUUID(),
        targetFieldKey: 'motivo_rechazo',
        whenFieldKey: 'resultado',
        operator: 'equals',
        value: 'RECHAZADO',
      },
    ],
    presentation: {
      resultado_evaluacion: {
        title: 'RESULTADO DE EVALUACIÓN',
        scoreField: 'calificacion_final',
        labelField: 'resultado',
        messages: {
          APROBADO: 'El proveedor cumple con los criterios establecidos.',
          'A PRUEBA': 'El proveedor deberá ser reevaluado en 90 días.',
          RECHAZADO: 'El proveedor no cumple — indique el motivo.',
        },
      },
    },
  })

  const form = await createForm({
    name: 'Evaluación de proveedor',
    description: 'Formulario demo M03 con secciones, condición y presentación enriquecida',
    recordTypeVersionId: rtv.id,
    createdBy,
  })

  const { updateFormDraftVersion, publishFormVersion } = await import('./forms.mjs')
  await updateFormDraftVersion(form.draftVersion.id, layout)
  await publishFormVersion(form.draftVersion.id)

  return { form: await getForm(form.id) }
}
