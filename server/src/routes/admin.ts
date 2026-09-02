import type { FastifyInstance } from 'fastify'
import { and, count, desc, eq, gte, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db/index.js'
import { schema } from '../db/index.js'
import { requireRole } from '../auth.js'

/** Админка владельца сервиса: кто пользуется, сколько данных, блокировка и удаление тренеров */
export function adminRoutes(app: FastifyInstance, db: Db) {
  const admin = { preHandler: requireRole('admin') }

  app.get('/api/admin/overview', admin, async () => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthKey = monthStart.toISOString().slice(0, 10)

    const trainers = await db.select().from(schema.users).where(eq(schema.users.role, 'trainer')).orderBy(desc(schema.users.createdAt))
    const [clientCounts, workoutCounts, paymentSums, [{ n: clientUsers }], [{ n: clientsTotal }], [{ n: workoutsWeek }], [{ s: paymentsMonth }], [{ s: paymentsTotal }]] =
      await Promise.all([
        db.select({ trainerId: schema.clients.trainerId, n: count() }).from(schema.clients).groupBy(schema.clients.trainerId),
        db
          .select({ trainerId: schema.workouts.trainerId, n: count(), last: sql<string | null>`max(${schema.workouts.startsAt})` })
          .from(schema.workouts)
          .groupBy(schema.workouts.trainerId),
        db
          .select({ trainerId: schema.payments.trainerId, sum: sql<number>`coalesce(sum(${schema.payments.amount}), 0)` })
          .from(schema.payments)
          .groupBy(schema.payments.trainerId),
        db.select({ n: count() }).from(schema.users).where(eq(schema.users.role, 'client')),
        db.select({ n: count() }).from(schema.clients),
        db.select({ n: count() }).from(schema.workouts).where(and(gte(schema.workouts.startsAt, weekAgo), eq(schema.workouts.status, 'done'))),
        db.select({ s: sql<number>`coalesce(sum(${schema.payments.amount}), 0)` }).from(schema.payments).where(gte(schema.payments.date, monthKey)),
        db.select({ s: sql<number>`coalesce(sum(${schema.payments.amount}), 0)` }).from(schema.payments),
      ])

    const by = <T extends { trainerId: string }>(rows: T[]) => new Map(rows.map((r) => [r.trainerId, r]))
    const cc = by(clientCounts)
    const wc = by(workoutCounts)
    const ps = by(paymentSums)

    const recentPayments = await db
      .select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        sessions: schema.payments.sessions,
        date: schema.payments.date,
        clientName: schema.clients.name,
        trainerName: schema.users.name,
      })
      .from(schema.payments)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.payments.clientId))
      .innerJoin(schema.users, eq(schema.users.id, schema.payments.trainerId))
      .orderBy(desc(schema.payments.date), desc(schema.payments.createdAt))
      .limit(8)

    return {
      totals: {
        trainers: trainers.length,
        trainersActiveWeek: trainers.filter((t) => t.lastSeenAt && t.lastSeenAt >= weekAgo).length,
        clientUsers: Number(clientUsers),
        clients: Number(clientsTotal),
        workoutsWeek: Number(workoutsWeek),
        paymentsMonth: Number(paymentsMonth),
        paymentsTotal: Number(paymentsTotal),
      },
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
      recentPayments,
    }
  })

  app.get('/api/admin/clients', admin, async () => {
    const rows = await db
      .select({
        id: schema.clients.id,
        name: schema.clients.name,
        phone: schema.clients.phone,
        status: schema.clients.status,
        pricePerSession: schema.clients.pricePerSession,
        createdAt: schema.clients.createdAt,
        userId: schema.clients.userId,
        trainerName: schema.users.name,
        trainerId: schema.users.id,
      })
      .from(schema.clients)
      .innerJoin(schema.users, eq(schema.users.id, schema.clients.trainerId))
      .orderBy(desc(schema.clients.createdAt))
    return { clients: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), inApp: !!r.userId })) }
  })

  app.get('/api/admin/payments', admin, async (req) => {
    const q = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }).parse(req.query ?? {})
    const rows = await db
      .select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        sessions: schema.payments.sessions,
        date: schema.payments.date,
        comment: schema.payments.comment,
        clientName: schema.clients.name,
        trainerName: schema.users.name,
        groupName: schema.groups.name,
      })
      .from(schema.payments)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.payments.clientId))
      .innerJoin(schema.users, eq(schema.users.id, schema.payments.trainerId))
      .leftJoin(schema.groups, eq(schema.groups.id, schema.payments.groupId))
      .where(q.month ? sql`to_char(${schema.payments.date}, 'YYYY-MM') = ${q.month}` : undefined)
      .orderBy(desc(schema.payments.date), desc(schema.payments.createdAt))
      .limit(500)
    return { payments: rows }
  })

  app.patch('/api/admin/trainers/:id', admin, async (req, reply) => {
    const params = z.object({ id: z.string() }).parse(req.params)
    const body = z.object({ blocked: z.boolean() }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'Ожидается { blocked: boolean }' })
    await db.update(schema.users).set({ blocked: body.data.blocked }).where(and(eq(schema.users.id, params.id), eq(schema.users.role, 'trainer')))
    if (body.data.blocked) await db.delete(schema.sessions).where(eq(schema.sessions.userId, params.id))
    return { ok: true }
  })

  /** Удаление тренера вместе со всеми его данными (каскад в базе) */
  app.delete('/api/admin/trainers/:id', admin, async (req, reply) => {
    const params = z.object({ id: z.string() }).parse(req.params)
    const [t] = await db.select().from(schema.users).where(and(eq(schema.users.id, params.id), eq(schema.users.role, 'trainer')))
    if (!t) return reply.code(404).send({ error: 'Тренер не найден' })
    await db.delete(schema.users).where(eq(schema.users.id, params.id))
    return { ok: true }
  })
}
