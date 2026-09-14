import express from 'express'
import {
  attachUser,
  clientIp,
  requireAuth,
  requirePermission,
} from './auth.mjs'
import { recordAudit } from './services.mjs'
import {
  archiveRecord,
  createRecord,
  finalizeRecord,
  getCaptureContext,
  getRecord,
  listPublishedForms,
  listRecords,
  restoreRecord,
  saveRecord,
} from './records.mjs'

export function createM04Router() {
  const router = express.Router()
  router.use(requireAuth)
  router.use(attachUser)

  router.get('/forms', requirePermission('view'), async (_req, res) => {
    res.json({ forms: await listPublishedForms() })
  })

  router.get('/forms/:versionId/context', requirePermission('view'), async (req, res) => {
    try {
      const context = await getCaptureContext(req.params.versionId)
      res.json({ context })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Formulario no disponible' })
    }
  })

  router.get('/records', requirePermission('view'), async (req, res) => {
    const records = await listRecords({
      formId: req.query.formId,
      status: req.query.status,
      createdBy: req.query.mine === '1' ? req.user.id : undefined,
      limit: Number(req.query.limit ?? 50),
    })
    res.json({ records })
  })

  router.get('/records/:id', requirePermission('view'), async (req, res) => {
    const record = await getRecord(req.params.id)
    if (!record) return res.status(404).json({ error: 'Registro no encontrado' })
    res.json({ record })
  })

  router.post('/records', requirePermission('create'), async (req, res) => {
    try {
      const result = await createRecord({
        formVersionId: req.body?.formVersionId,
        userId: req.user.id,
        data: req.body?.data ?? {},
      })
      await recordAudit({
        action: 'record.created',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { recordId: result.record.id, formId: result.record.form_id },
        ipAddress: clientIp(req),
      })
      res.status(201).json(result)
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo crear' })
    }
  })

  router.put('/records/:id', requirePermission('edit'), async (req, res) => {
    try {
      const result = await saveRecord(
        req.params.id,
        req.user.id,
        req.body?.data ?? {},
        req.body?.lockVersion,
      )
      await recordAudit({
        action: 'record.saved',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { recordId: req.params.id, status: result.record.status },
        ipAddress: clientIp(req),
      })
      res.json(result)
    } catch (err) {
      if (err?.code === 'CONFLICT') return res.status(409).json({ error: err.message })
      res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo guardar' })
    }
  })

  router.post('/records/:id/finalize', requirePermission('create'), async (req, res) => {
    try {
      const result = await finalizeRecord(
        req.params.id,
        req.user.id,
        req.body?.data ?? {},
        req.body?.lockVersion,
      )
      await recordAudit({
        action: 'record.finalized',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { recordId: req.params.id, folio: result.record.folio },
        ipAddress: clientIp(req),
      })
      res.json(result)
    } catch (err) {
      if (err?.code === 'CONFLICT') return res.status(409).json({ error: err.message })
      if (err?.code === 'VALIDATION') {
        return res.status(422).json({ error: err.message, details: err.details })
      }
      res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo finalizar' })
    }
  })

  router.post('/records/:id/archive', requirePermission('archive'), async (req, res) => {
    try {
      const record = await archiveRecord(req.params.id, req.user.id)
      await recordAudit({
        action: 'record.archived',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { recordId: req.params.id },
        ipAddress: clientIp(req),
      })
      res.json({ record })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo archivar' })
    }
  })

  router.post('/records/:id/restore', requirePermission('edit'), async (req, res) => {
    try {
      const record = await restoreRecord(req.params.id, req.user.id)
      res.json({ record })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo restaurar' })
    }
  })

  return router
}
