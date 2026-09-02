import type { FastifyInstance } from 'fastify'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/index.js'
import { schema } from '../db/index.js'
import { checkPassword, createSession, destroySession, hashPassword, newId, normalizePhone, requireRole } from '../auth.js'

const RegisterSchema = z.object({
  role: z.enum(['trainer', 'client']),
  name: z.string().trim().min(2).max(120),
  phone: z.string().min(10).max(32),
  password: z.string().min(4).max(200),
})
const LoginSchema = z.object({ phone: z.string().min(1), password: z.string().min(1) })

export function authRoutes(app: FastifyInstance, db: Db) {
  app.post('/api/auth/register', async (req, reply) => {
    const parsed = RegisterSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Проверьте имя, телефон и пароль (не короче 4 символов)' })
    const { role, name, password } = parsed.data
    const phone = normalizePhone(parsed.data.phone)
    if (phone.length !== 11) return reply.code(400).send({ error: 'Введите телефон полностью' })

    const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.phone, phone))
    if (exists) return reply.code(409).send({ error: 'Этот телефон уже зарегистрирован' })

    const id = newId()
    await db.insert(schema.users).values({ id, role, name, phone, passwordHash: await hashPassword(password) })

    // Подопечный: привязываем ко всем карточкам с этим телефоном, которые тренеры уже завели
    if (role === 'client') {
      await db
        .update(schema.clients)
        .set({ userId: id })
        .where(and(eq(schema.clients.phone, phone), isNull(schema.clients.userId)))
    }

    const token = await createSession(db, id)
    return { token, user: { id, role, name, phone } }
  })

  app.post('/api/auth/login', async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Введите телефон и пароль' })
    const phone = normalizePhone(parsed.data.phone)
    const [u] = await db.select().from(schema.users).where(eq(schema.users.phone, phone))
    if (!u) return reply.code(404).send({ error: 'Пользователь с таким телефоном не найден' })
    if (!(await checkPassword(parsed.data.password, u.passwordHash))) return reply.code(401).send({ error: 'Неверный пароль' })
    if (u.blocked) return reply.code(403).send({ error: 'Аккаунт заблокирован' })
    const token = await createSession(db, u.id)
    await db.update(schema.users).set({ lastSeenAt: new Date() }).where(eq(schema.users.id, u.id))
    return { token, user: { id: u.id, role: u.role, name: u.name, phone: u.phone } }
  })

  app.post('/api/auth/logout', { preHandler: requireRole() }, async (req) => {
    if (req.token) await destroySession(db, req.token)
    return { ok: true }
  })

  app.get('/api/me', { preHandler: requireRole() }, async (req) => {
    const u = req.user!
    await db.update(schema.users).set({ lastSeenAt: new Date() }).where(eq(schema.users.id, u.id))
    return { user: { id: u.id, role: u.role, name: u.name, phone: u.phone } }
  })
}
