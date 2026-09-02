import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'
import { runMigrations } from './migrate.mjs'
import { createApiRouter, createSessionMiddleware } from './routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const isProd = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 43123)

function loadEnvFile(name) {
  const p = path.join(root, name)
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[qualitra] DATABASE_URL is required')
    process.exit(1)
  }

  await runMigrations()

  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json({ limit: '1mb' }))
  app.use(createSessionMiddleware())
  app.use('/api', createApiRouter())

  if (isProd) {
    const dist = path.join(root, 'dist')
    app.use(express.static(dist))
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'))
    })
  } else {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true, hmr: { port: 24679 } },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Qualitra ${isProd ? 'production' : 'dev'} → http://0.0.0.0:${port}`)
  })
}

main().catch((err) => {
  console.error('[qualitra] fatal', err)
  process.exit(1)
})
