import type { FastifyInstance } from 'fastify'
import { count, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/index.js'
import { schema } from '../db/index.js'
import { requireRole } from '../auth.js'

/** Админка владельца сервиса: кто из тренеров пользуется, сколько у кого клиентов, блокировка */
export function adminRoutes(app: FastifyInstance, db: Db) {
  app.get('/api/admin/overview', { preHandler: requireRole('admin') }, async () => {
    const trainers = await db.select().from(schema.users).where(eq(schema.users.role, 'trainer')).orderBy(desc(schema.users.createdAt))
    const clientCounts = await db
      .select({ trainerId: schema.clients.trainerId, n: count() })
      .from(schema.clients)
      .groupBy(schema.clients.trainerId)
    const workoutCounts = await db
      .select({ trainerId: schema.workouts.trainerId, n: count(), last: sql<string | null>`max(${schema.workouts.startsAt})` })
      .from(schema.workouts)
      .groupBy(schema.workouts.trainerId)
    const paymentSums = await db
      .select({ trainerId: schema.payments.trainerId, sum: sql<number>`coalesce(sum(${schema.payments.amount}), 0)` })
      .from(schema.payments)
      .groupBy(schema.payments.trainerId)
    const [{ n: clientUsers }] = await db.select({ n: count() }).from(schema.users).where(eq(schema.users.role, 'client'))

    const by = <T extends { trainerId: string }>(rows: T[]) => new Map(rows.map((r) => [r.trainerId, r]))
    const cc = by(clientCounts)
    const wc = by(workoutCounts)
    const ps = by(paymentSums)

    return {
      totals: { trainers: trainers.length, clientUsers: Number(clientUsers) },
      trainers: trainers.map((t) => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        blocked: t.blocked,
        createdAt: t.createdAt.toISOString(),
        lastSeenAt: t.lastSeenAt?.toISOString() ?? null,
        clients: Number(cc.get(t.id)?.n ?? 0),
        workouts: Number(wc.get(t.id)?.n ?? 0),
        lastWorkoutAt: wc.get(t.id)?.last ?? null,
        paymentsTotal: Number(ps.get(t.id)?.sum ?? 0),
      })),
    }
  })

  app.patch('/api/admin/trainers/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const params = z.object({ id: z.string() }).parse(req.params)
    const body = z.object({ blocked: z.boolean() }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Ожидается { blocked: boolean }' })
    await db.update(schema.users).set({ blocked: body.data.blocked }).where(eq(schema.users.id, params.id))
    if (body.data.blocked) await db.delete(schema.sessions).where(eq(schema.sessions.userId, params.id))
    return { ok: true }
  })
}
