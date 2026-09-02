import type { FastifyInstance } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/index.js'
import { schema } from '../db/index.js'
import { requireRole } from '../auth.js'
import { getBotUsername, makeLinkCode, sendMessage, telegramEnabled, unlink } from '../telegram.js'

/** Приглашение по ссылке: кто зовёт и кого */
export function inviteRoutes(app: FastifyInstance, db: Db) {
  app.get('/api/invite/:token', async (req, reply) => {
    const { token } = z.object({ token: z.string().min(4).max(64) }).parse(req.params)
    const [c] = await db.select().from(schema.clients).where(eq(schema.clients.inviteToken, token))
    if (!c) return reply.code(404).send({ error: 'Ссылка недействительна' })
    const [t] = await db.select().from(schema.users).where(eq(schema.users.id, c.trainerId))
    return { trainerName: t?.name ?? '', clientName: c.name, phone: c.phone ?? null, linked: !!c.userId }
  })

  /**
   * Напомнить подопечному об оплате. Если у него подключён Telegram — уходит через бота,
   * иначе возвращаем готовый текст, который тренер отправит сам.
   */
  app.post('/api/remind/payment', { preHandler: requireRole('trainer') }, async (req, reply) => {
    const body = z.object({ clientId: z.string(), text: z.string().min(1).max(1000) }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Нужны clientId и text' })
    const [c] = await db
      .select()
      .from(schema.clients)
      .where(and(eq(schema.clients.id, body.data.clientId), eq(schema.clients.trainerId, req.user!.id)))
    if (!c) return reply.code(404).send({ error: 'Подопечный не найден' })
    let chat: string | null = null
    if (c.userId) {
      const [u] = await db.select({ chat: schema.users.telegramChatId }).from(schema.users).where(eq(schema.users.id, c.userId))
      chat = u?.chat ?? null
    }
    if (chat && telegramEnabled) {
      const ok = await sendMessage(chat, body.data.text.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
      if (ok) return { sent: true }
    }
    return { sent: false }
  })

  /** Ссылка для подключения Telegram текущему пользователю */
  app.post('/api/telegram/link', { preHandler: requireRole() }, async (req, reply) => {
    if (!telegramEnabled) return reply.code(404).send({ error: 'Telegram-бот не настроен на сервере' })
    return makeLinkCode(db, req.user!.id)
  })
  app.delete('/api/telegram/link', { preHandler: requireRole() }, async (req) => {
    await unlink(db, req.user!.id)
    return { ok: true }
  })
  app.get('/api/telegram/status', { preHandler: requireRole() }, async (req) => {
    const [u] = await db.select({ chat: schema.users.telegramChatId }).from(schema.users).where(eq(schema.users.id, req.user!.id))
    return { enabled: telegramEnabled, bot: getBotUsername(), linked: !!u?.chat }
  })
}

/** Привязать карточку по токену приглашения к пользователю (после регистрации или входа) */
export async function applyInvite(db: Db, token: string | undefined, userId: string) {
  if (!token) return
  const [c] = await db.select().from(schema.clients).where(eq(schema.clients.inviteToken, token))
  if (!c || c.userId) return
  await db.update(schema.clients).set({ userId }).where(eq(schema.clients.id, c.id))
}
