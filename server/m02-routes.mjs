import express from 'express'
import {
  attachUser,
  clientIp,
  requireAuth,
  requireImplementor,
  requirePermission,
} from './auth.mjs'
import { recordAudit } from './services.mjs'
import {
  addCatalogOption,
  createCatalog,
  listCatalogs,
  reorderCatalogOptions,
  updateCatalogOption,
} from './catalogs.mjs'
import {
  createDraftVersion,
  createRecordType,
  exportConfiguration,
  getRecordType,
  getRecordTypeVersion,
  importConfiguration,
  listRecordTypes,
  publishVersion,
  updateDraftVersion,
} from './record-types.mjs'
import { evaluateSchemaCalculations } from './expression-engine.mjs'
import { validateSampleData } from './schema-validation.mjs'
import { getDemoScenarios, seedDemoCase } from './m02-demo.mjs'

export function createM02Router() {
  const router = express.Router()
  router.use(requireAuth)
  router.use(attachUser)

  router.get('/catalogs', requirePermission('configure'), async (_req, res) => {
    res.json({ catalogs: await listCatalogs() })
  })

  router.post('/catalogs', requirePermission('configure'), async (req, res) => {
    try {
      const catalog = await createCatalog(req.body ?? {})
      await recordAudit({
        action: 'catalog.created',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { catalogId: catalog.id, slug: catalog.slug },
        ipAddress: clientIp(req),
      })
      res.status(201).json({ catalog })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al crear catálogo' })
    }
  })

  router.post('/catalogs/:id/options', requirePermission('configure'), async (req, res) => {
    try {
      const option = await addCatalogOption(req.params.id, req.body ?? {})
      res.status(201).json({ option })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al añadir opción' })
    }
  })

  router.patch('/catalog-options/:id', requirePermission('configure'), async (req, res) => {
    try {
      const option = await updateCatalogOption(req.params.id, req.body ?? {})
      if (!option) return res.status(404).json({ error: 'Opción no encontrada' })
      res.json({ option })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al actualizar' })
    }
  })

  router.put('/catalogs/:id/reorder', requirePermission('configure'), async (req, res) => {
    try {
      const catalog = await reorderCatalogOptions(req.params.id, req.body?.orderedIds ?? [])
      res.json({ catalog })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al ordenar' })
    }
  })

  router.get('/record-types', requirePermission('configure'), async (_req, res) => {
    res.json({ recordTypes: await listRecordTypes() })
  })

  router.get('/record-types/:id', requirePermission('configure'), async (req, res) => {
    const recordType = await getRecordType(req.params.id)
    if (!recordType) return res.status(404).json({ error: 'Tipo no encontrado' })
    res.json({ recordType })
  })

  router.post('/record-types', requirePermission('configure'), async (req, res) => {
    try {
      const recordType = await createRecordType({ ...req.body, createdBy: req.user.id })
      await recordAudit({
        action: 'record_type.created',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { recordTypeId: recordType.id, slug: recordType.slug },
        ipAddress: clientIp(req),
      })
      res.status(201).json({ recordType })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al crear tipo' })
    }
  })

  router.post('/record-types/:id/versions', requirePermission('configure'), async (req, res) => {
    try {
      const version = await createDraftVersion(req.params.id, req.body?.schema ?? {}, req.user.id)
      res.status(201).json({ version })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al crear versión' })
    }
  })

  router.put('/record-type-versions/:id', requirePermission('configure'), async (req, res) => {
    try {
      const version = await updateDraftVersion(req.params.id, req.body?.schema ?? {})
      res.json({ version })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al guardar borrador' })
    }
  })

  router.post('/record-type-versions/:id/publish', requirePermission('configure'), async (req, res) => {
    try {
      const version = await publishVersion(req.params.id)
      await recordAudit({
        action: 'record_type.published',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { versionId: version.id, versionNumber: version.version_number },
        ipAddress: clientIp(req),
      })
      res.json({ version })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al publicar' })
    }
  })

  router.get('/record-type-versions/:id', requirePermission('configure'), async (req, res) => {
    const version = await getRecordTypeVersion(req.params.id)
    if (!version) return res.status(404).json({ error: 'Versión no encontrada' })
    res.json({ version })
  })

  router.post('/record-type-versions/:id/simulate', requirePermission('configure'), async (req, res) => {
    const version = await getRecordTypeVersion(req.params.id)
    if (!version) return res.status(404).json({ error: 'Versión no encontrada' })
    const sampleData = req.body?.sampleData ?? {}
    const finalize = Boolean(req.body?.finalize)
    const validation = validateSampleData(version.schema, sampleData, { finalize })
    const calculations = evaluateSchemaCalculations(version.schema, sampleData)
    res.json({ validation, calculations })
  })

  router.post('/demo/seed', requirePermission('configure'), async (req, res) => {
    try {
      const result = await seedDemoCase(req.user.id)
      await recordAudit({
        action: 'm02.demo_seeded',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { alreadyExists: result.alreadyExists ?? false },
        ipAddress: clientIp(req),
      })
      res.status(result.alreadyExists ? 200 : 201).json(result)
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al cargar demo' })
    }
  })

  router.get('/demo/scenarios', requirePermission('configure'), (_req, res) => {
    res.json({ scenarios: getDemoScenarios() })
  })

  router.get('/export', requireImplementor, async (req, res) => {
    const payload = await exportConfiguration()
    await recordAudit({
      action: 'm02.exported',
      actorEmail: req.user.email,
      actorId: req.user.id,
      ipAddress: clientIp(req),
    })
    res.json(payload)
  })

  router.post('/import', requireImplementor, async (req, res) => {
    try {
      const payload = await importConfiguration(req.body ?? {}, { merge: Boolean(req.body?.merge) })
      await recordAudit({
        action: 'm02.imported',
        actorEmail: req.user.email,
        actorId: req.user.id,
        metadata: { merge: Boolean(req.body?.merge) },
        ipAddress: clientIp(req),
      })
      res.json({ ok: true, configuration: payload })
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al importar' })
    }
  })

  router.post('/expressions/test', requireImplementor, async (req, res) => {
    try {
      const { expression, sampleData } = req.body ?? {}
      const result = evaluateSchemaCalculations(
        { calculations: [{ key: 'preview', expression }] },
        sampleData ?? {},
      )
      res.json(result)
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Expresión inválida' })
    }
  })

  return router
}
