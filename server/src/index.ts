import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { connect } from './db/index.js'
import { makeAuthHook } from './auth.js'
import { authRoutes } from './routes/auth.js'
import { stateRoutes } from './routes/state.js'
import { adminRoutes } from './routes/admin.js'
import { DEMO_PASSWORD, DEMO_TRAINER_PHONE, ensureAdmin, seedDemo } from './seed.js'

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'
const DEMO = process.env.DEMO === '1'
const publicDir = process.env.PUBLIC_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public')

async function main() {
  const { db, kind } = await connect()
  await ensureAdmin(db)
  if (DEMO && (await seedDemo(db))) console.log('Демо-данные созданы')

  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' }, trustProxy: true, bodyLimit: 256 * 1024 })
  app.addHook('preHandler', makeAuthHook(db))

  app.get('/api/health', async () => ({ ok: true, db: kind }))
  app.get('/api/config', async () => ({
    demo: DEMO,
    demoLogins: DEMO
      ? [
          { label: 'Тренер · Алексей', phone: DEMO_TRAINER_PHONE, password: DEMO_PASSWORD },
          { label: 'Подопечный · Анна', phone: '79161234567', password: DEMO_PASSWORD },
          { label: 'Подопечный · Игорь', phone: '79035551020', password: DEMO_PASSWORD },
        ]
      : [],
  }))

  authRoutes(app, db)
  stateRoutes(app, db)
  adminRoutes(app, db)

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Не найдено' })
    // SPA: любой другой адрес отдаёт приложение
    return reply.sendFile('index.html')
  })

  if (fs.existsSync(publicDir)) {
    await app.register(fastifyStatic, { root: publicDir, index: ['index.html'], maxAge: '1h', immutable: false })
  } else {
    app.log.warn(`Каталог фронтенда ${publicDir} не найден, отдаю только API`)
    app.decorateReply('sendFile', function (this: import('fastify').FastifyReply) {
      return this.code(404).send({ error: 'Фронтенд не собран' })
    })
  }

  await app.listen({ port: PORT, host: HOST })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
