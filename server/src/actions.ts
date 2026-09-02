import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from './db/index.js'
import { schema } from './db/index.js'
import { normalizePhone } from './auth.js'
import { randomBytes } from 'node:crypto'

/**
 * Действия тренера. Формат повторяет Action из фронтенда (src/data/store.tsx),
 * поэтому экран отправляет то же самое, что применяет локально.
 * Каждое действие проверяет, что затронутые записи принадлежат тренеру.
 */

const id = z.string().min(1).max(64)
const attendance = z.enum(['present', 'missed', 'excused'])
const status = z.enum(['planned', 'done', 'cancelled', 'missed'])
const kind = z.enum(['strength', 'cardio', 'functional', 'stretching', 'other'])

const clientFields = {
  name: z.string().trim().min(1).max(120),
  phone: z.string().max(32).optional(),
  pricePerSession: z.number().int().min(0).max(1_000_000),
  note: z.string().max(2000).optional(),
  status: z.enum(['active', 'paused']).optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
}
const groupFields = {
  name: z.string().trim().min(1).max(120),
  pricePerSession: z.number().int().min(0).max(1_000_000),
}

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('client/add'), client: z.object({ id, createdAt: z.string().optional(), userId: z.string().optional(), ...clientFields }) }),
  z.object({ type: z.literal('client/update'), id, patch: z.object(clientFields).partial() }),
  z.object({ type: z.literal('client/remove'), id }),
  z.object({ type: z.literal('client/invite'), id }),
  z.object({ type: z.literal('group/add'), group: z.object({ id, createdAt: z.string().optional(), memberIds: z.array(id).optional(), ...groupFields }) }),
  z.object({ type: z.literal('group/update'), id, patch: z.object(groupFields).partial() }),
  z.object({ type: z.literal('group/remove'), id }),
  z.object({ type: z.literal('group/addMember'), id, clientId: id }),
  z.object({ type: z.literal('group/removeMember'), id, clientId: id }),
  z.object({
    type: z.literal('payment/add'),
    payment: z.object({
      id,
      clientId: id,
      groupId: id.optional(),
      amount: z.number().int().min(0).max(100_000_000),
      sessions: z.number().int().min(0).max(10_000),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      comment: z.string().max(500).optional(),
    }),
  }),
  z.object({ type: z.literal('payment/remove'), id }),
  z.object({
    type: z.literal('workout/add'),
    workout: z.object({
      id,
      clientId: id.optional(),
      groupId: id.optional(),
      startsAt: z.string().datetime({ offset: true }),
      durationMin: z.number().int().min(5).max(600),
      kind: kind.optional(),
      status: status.optional(),
      note: z.string().max(2000).optional(),
    }),
  }),
  z.object({ type: z.literal('workout/setStatus'), id, status }),
  z.object({ type: z.literal('workout/setAttendance'), id, clientId: id, value: attendance }),
  z.object({
    type: z.literal('workout/update'),
    id,
    patch: z.object({ startsAt: z.string().datetime({ offset: true }), durationMin: z.number().int().min(5).max(600), kind, note: z.string().max(2000).optional() }).partial(),
  }),
  z.object({ type: z.literal('workout/remove'), id }),
  z.object({
    type: z.literal('exercise/add'),
    entry: z.object({
      id,
      clientId: id,
      workoutId: id.optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      exercise: z.string().trim().min(1).max(120),
      weightKg: z.number().min(0).max(1000).optional(),
      reps: z.number().int().min(0).max(1000).optional(),
      sets: z.number().int().min(0).max(100).optional(),
      note: z.string().max(500).optional(),
    }),
  }),
  z.object({ type: z.literal('exercise/remove'), id }),
])
export type Action = z.infer<typeof ActionSchema>

export class ActionError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message)
  }
}

async function ownClient(db: Db, trainerId: string, clientId: string) {
  const [c] = await db
    .select()
    .from(schema.clients)
    .where(and(eq(schema.clients.id, clientId), eq(schema.clients.trainerId, trainerId)))
  if (!c) throw new ActionError('Подопечный не найден', 404)
  return c
}
async function ownGroup(db: Db, trainerId: string, groupId: string) {
  const [g] = await db
    .select()
    .from(schema.groups)
    .where(and(eq(schema.groups.id, groupId), eq(schema.groups.trainerId, trainerId)))
  if (!g) throw new ActionError('Группа не найдена', 404)
  return g
}
async function ownWorkout(db: Db, trainerId: string, workoutId: string) {
  const [w] = await db
    .select()
    .from(schema.workouts)
    .where(and(eq(schema.workouts.id, workoutId), eq(schema.workouts.trainerId, trainerId)))
  if (!w) throw new ActionError('Тренировка не найдена', 404)
  return w
}

/** Если у тренера есть карточка с этим телефоном без аккаунта — привязать к зарегистрированному подопечному */
async function linkedUserByPhone(db: Db, phone: string | undefined): Promise<string | null> {
  if (!phone) return null
  const [u] = await db.select().from(schema.users).where(and(eq(schema.users.phone, phone), eq(schema.users.role, 'client')))
  return u?.id ?? null
}

export async function applyAction(db: Db, trainerId: string, action: Action): Promise<void> {
  switch (action.type) {
    case 'client/add': {
      const c = action.client
      const phone = c.phone ? normalizePhone(c.phone) : null
      await db.insert(schema.clients).values({
        id: c.id,
        trainerId,
        name: c.name,
        phone,
        pricePerSession: c.pricePerSession,
        note: c.note ?? null,
        status: c.status ?? 'active',
        birthday: c.birthday ?? null,
        userId: await linkedUserByPhone(db, phone ?? undefined),
      })
      return
    }
    case 'client/update': {
      await ownClient(db, trainerId, action.id)
      const p = action.patch
      const phone = p.phone === undefined ? undefined : p.phone ? normalizePhone(p.phone) : null
      await db
        .update(schema.clients)
        .set({
          ...(p.name !== undefined && { name: p.name }),
          ...(phone !== undefined && { phone, userId: await linkedUserByPhone(db, phone ?? undefined) }),
          ...(p.pricePerSession !== undefined && { pricePerSession: p.pricePerSession }),
          ...(p.note !== undefined && { note: p.note || null }),
          ...(p.status !== undefined && { status: p.status }),
          ...(p.birthday !== undefined && { birthday: p.birthday }),
        })
        .where(eq(schema.clients.id, action.id))
      return
    }
    case 'client/remove':
      await ownClient(db, trainerId, action.id)
      await db.delete(schema.clients).where(eq(schema.clients.id, action.id))
      return
    case 'client/invite': {
      const c = await ownClient(db, trainerId, action.id)
      if (c.inviteToken) return
      await db.update(schema.clients).set({ inviteToken: randomBytes(9).toString('base64url') }).where(eq(schema.clients.id, action.id))
      return
    }
    case 'group/add':
      await db.insert(schema.groups).values({ id: action.group.id, trainerId, name: action.group.name, pricePerSession: action.group.pricePerSession })
      return
    case 'group/update':
      await ownGroup(db, trainerId, action.id)
      await db.update(schema.groups).set(action.patch).where(eq(schema.groups.id, action.id))
      return
    case 'group/remove':
      await ownGroup(db, trainerId, action.id)
      await db.delete(schema.groups).where(eq(schema.groups.id, action.id))
      return
    case 'group/addMember': {
      await ownGroup(db, trainerId, action.id)
      await ownClient(db, trainerId, action.clientId)
      const existing = await db.select().from(schema.groupMembers).where(eq(schema.groupMembers.groupId, action.id))
      if (existing.some((m) => m.clientId === action.clientId)) return
      await db.insert(schema.groupMembers).values({ groupId: action.id, clientId: action.clientId, position: existing.length })
      return
    }
    case 'group/removeMember':
      await ownGroup(db, trainerId, action.id)
      await db
        .delete(schema.groupMembers)
        .where(and(eq(schema.groupMembers.groupId, action.id), eq(schema.groupMembers.clientId, action.clientId)))
      return
    case 'payment/add': {
      const p = action.payment
      await ownClient(db, trainerId, p.clientId)
      if (p.groupId) await ownGroup(db, trainerId, p.groupId)
      await db.insert(schema.payments).values({
        id: p.id,
        trainerId,
        clientId: p.clientId,
        groupId: p.groupId ?? null,
        amount: p.amount,
        sessions: p.sessions,
        date: p.date,
        comment: p.comment ?? null,
      })
      return
    }
    case 'payment/remove': {
      const [p] = await db
        .select()
        .from(schema.payments)
        .where(and(eq(schema.payments.id, action.id), eq(schema.payments.trainerId, trainerId)))
      if (!p) throw new ActionError('Оплата не найдена', 404)
      await db.delete(schema.payments).where(eq(schema.payments.id, action.id))
      return
    }
    case 'workout/add': {
      const w = action.workout
      if (!w.clientId && !w.groupId) throw new ActionError('Укажите подопечного или группу')
      if (w.clientId) await ownClient(db, trainerId, w.clientId)
      if (w.groupId) await ownGroup(db, trainerId, w.groupId)
      await db.insert(schema.workouts).values({
        id: w.id,
        trainerId,
        clientId: w.clientId ?? null,
        groupId: w.groupId ?? null,
        startsAt: new Date(w.startsAt),
        durationMin: w.durationMin,
        kind: w.kind ?? 'strength',
        status: w.status ?? 'planned',
        note: w.note ?? null,
      })
      return
    }
    case 'workout/setStatus': {
      const w = await ownWorkout(db, trainerId, action.id)
      let att = w.attendance
      if (w.groupId && action.status === 'done' && !att) {
        const members = await db.select().from(schema.groupMembers).where(eq(schema.groupMembers.groupId, w.groupId))
        att = Object.fromEntries(members.map((m) => [m.clientId, 'present' as const]))
      }
      if (action.status === 'planned') att = null
      await db.update(schema.workouts).set({ status: action.status, attendance: att }).where(eq(schema.workouts.id, action.id))
      return
    }
    case 'workout/setAttendance': {
      const w = await ownWorkout(db, trainerId, action.id)
      await db
        .update(schema.workouts)
        .set({ attendance: { ...(w.attendance ?? {}), [action.clientId]: action.value } })
        .where(eq(schema.workouts.id, action.id))
      return
    }
    case 'workout/update': {
      await ownWorkout(db, trainerId, action.id)
      const p = action.patch
      await db
        .update(schema.workouts)
        .set({
          ...(p.startsAt !== undefined && { startsAt: new Date(p.startsAt) }),
          ...(p.durationMin !== undefined && { durationMin: p.durationMin }),
          ...(p.kind !== undefined && { kind: p.kind }),
          ...(p.note !== undefined && { note: p.note || null }),
        })
        .where(eq(schema.workouts.id, action.id))
      return
    }
    case 'workout/remove':
      await ownWorkout(db, trainerId, action.id)
      await db.delete(schema.workouts).where(eq(schema.workouts.id, action.id))
      return
    case 'exercise/add': {
      const e = action.entry
      await ownClient(db, trainerId, e.clientId)
      if (e.workoutId) await ownWorkout(db, trainerId, e.workoutId)
      await db.insert(schema.exerciseEntries).values({
        id: e.id,
        trainerId,
        clientId: e.clientId,
        workoutId: e.workoutId ?? null,
        date: e.date,
        exercise: e.exercise,
        weightKg: e.weightKg ?? null,
        reps: e.reps ?? null,
        sets: e.sets ?? null,
        note: e.note ?? null,
      })
      return
    }
    case 'exercise/remove': {
      const [e] = await db
        .select()
        .from(schema.exerciseEntries)
        .where(and(eq(schema.exerciseEntries.id, action.id), eq(schema.exerciseEntries.trainerId, trainerId)))
      if (!e) throw new ActionError('Запись не найдена', 404)
      await db.delete(schema.exerciseEntries).where(eq(schema.exerciseEntries.id, action.id))
      return
    }
  }
}
