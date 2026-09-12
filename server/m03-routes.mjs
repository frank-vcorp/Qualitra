import express from 'express'
import {
  attachUser,
  clientIp,
  requireAuth,
  requireImplementor,
  requirePermission,
} from './auth.mjs'
import { recordAudit } from './services.mjs'
import { listRecordTypes, getRecordTypeVersion } from './record-types.mjs'
import {
  addFieldToTypeFromForm,
  createForm,
  duplicateForm,
  exportFormContext,
  getForm,
  getFormVersion,
  listForms,
  previewForm,
  publishFormVersion,
  updateFormDraftVersion,
  withdrawFormVersion,
  createFormDraftVersion,
} from './forms.mjs'
import { seedEvaluacionForm } from './m03-demo.mjs'

export function createM03Router() {
  const router = express.Router()
  router.use(requireAuth)
  router.use(attachUser)

  router.get('/forms', requirePermission('configure'), async (_req, res) => {
    res.json({ forms: await listForms() })
  })

  router.get('/forms/:id', requirePermission('configure'), async (req, res) => {
    const form = await getForm(req.params.id)
    if (!form) return res.status(404).json({ error: 'Formulario no encontrado' })
    res.json({ form })
  })

  router.get('/published-record-types', requirePermission('configure'), async (_req, res) => {
    const types = await listRecordTypes()
    const options = []
    for (const rt of types) {
      for (const v of rt.versions) {
        if (v.status === 'published') {
          const detail = await getRecordTypeVersion(v.id)
          options.push({
            recordTypeId: rt.id,
            recordTypeName: rt.name,
            versionId: v.id,
            versionNumber: v.version_number,
            fieldCount: detail?.schema?.fields?.length ?? 0,
          })
        }
      }
    }
    res.json({ options })
  })

  router.post('/forms', requirePermission('configure'), async (req, res) => {
    try {
      const form = await createForm({ ...req.body, createdBy: req.user.id })
      await recordAudit({
        action: 'form.created',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { formId: form.id, name: form.name },
        ipAddress: clientIp(req),
      })
      res.status(201).json({ form })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al crear formulario' })
    }
  })

  router.post('/forms/:id/duplicate', requirePermission('configure'), async (req, res) => {
    try {
      const form = await duplicateForm(req.params.id, req.user.id)
      res.status(201).json({ form })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al duplicar' })
    }
  })

  router.put('/form-versions/:id', requirePermission('configure'), async (req, res) => {
    try {
      const version = await updateFormDraftVersion(req.params.id, req.body?.layout ?? {})
      res.json({ version })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al guardar' })
    }
  })

  router.post('/form-versions/:id/publish', requirePermission('configure'), async (req, res) => {
    try {
      const version = await publishFormVersion(req.params.id)
      await recordAudit({
        action: 'form.published',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { versionId: version.id },
        ipAddress: clientIp(req),
      })
      res.json({ version })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al publicar' })
    }
  })

  router.post('/form-versions/:id/withdraw', requirePermission('configure'), async (req, res) => {
    try {
      const version = await withdrawFormVersion(req.params.id)
      res.json({ version })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al retirar' })
    }
  })

  router.get('/form-versions/:id', requirePermission('configure'), async (req, res) => {
    const version = await getFormVersion(req.params.id)
    if (!version) return res.status(404).json({ error: 'Versión no encontrada' })
    res.json({ version })
  })

  router.post('/form-versions/:id/preview', requirePermission('configure'), async (req, res) => {
    const version = await getFormVersion(req.params.id)
    if (!version) return res.status(404).json({ error: 'Versión no encontrada' })
    res.json(previewForm(version, req.body?.sampleData ?? {}))
  })

  router.get('/form-versions/:id/context', requireImplementor, async (req, res) => {
    const version = await getFormVersion(req.params.id)
    if (!version) return res.status(404).json({ error: 'Versión no encontrada' })
    res.json(exportFormContext(version))
  })

  router.post('/forms/:id/versions', requirePermission('configure'), async (req, res) => {
    try {
      const form = await getForm(req.params.id)
      if (!form) return res.status(404).json({ error: 'Formulario no encontrado' })
      const base = form.versionDetails[0]
      const version = await createFormDraftVersion(req.params.id, base.layout, req.user.id)
      res.status(201).json({ version })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al crear versión' })
    }
  })

  router.post('/record-type-versions/:id/fields', requirePermission('configure'), async (req, res) => {
    try {
      const version = await addFieldToTypeFromForm(req.params.id, req.body?.field, req.user.id)
      res.status(201).json({ version })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al añadir campo' })
    }
  })

  router.post('/demo/evaluacion-form', requirePermission('configure'), async (req, res) => {
    try {
      const result = await seedEvaluacionForm(req.user.id)
      res.status(result.alreadyExists ? 200 : 201).json(result)
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al cargar demo' })
    }
  })

  return router
}
