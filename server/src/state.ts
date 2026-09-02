import { and, eq, inArray, or } from 'drizzle-orm'
import type { Db } from './db/index.js'
import { schema } from './db/index.js'

/** Формат состояния, который ждёт фронтенд (совпадает с AppState в src/data/types.ts) */
export interface ClientDto {
  id: string
  name: string
  phone?: string
  pricePerSession: number
  note?: string
  status: 'active' | 'paused'
  birthday?: string
  createdAt: string
  userId?: string
}
export interface ExerciseDto {
  id: string
  clientId: string
  workoutId?: string
  date: string
  exercise: string
  weightKg?: number
  reps?: number
  sets?: number
  note?: string
}
export interface GroupDto {
  id: string
  name: string
  pricePerSession: number
  memberIds: string[]
  createdAt: string
}
export interface PaymentDto {
  id: string
  clientId: string
  groupId?: string
  amount: number
  sessions: number
  date: string
  comment?: string
}
export interface WorkoutDto {
  id: string
  clientId?: string
  groupId?: string
  startsAt: string
  durationMin: number
  status: string
  attendance?: Record<string, 'present' | 'missed' | 'excused'>
  note?: string
}
export interface StateDto {
  trainer: { id: string; name: string; phone: string }
  clients: ClientDto[]
  groups: GroupDto[]
  payments: PaymentDto[]
  workouts: WorkoutDto[]
  exercises: ExerciseDto[]
}

const und = <T>(v: T | null): T | undefined => (v === null ? undefined : v)

function toClient(c: typeof schema.clients.$inferSelect): ClientDto {
  return {
    id: c.id,
    name: c.name,
    phone: und(c.phone),
    pricePerSession: c.pricePerSession,
    note: und(c.note),
    status: c.status as 'active' | 'paused',
    birthday: und(c.birthday),
    createdAt: c.createdAt.toISOString(),
    userId: und(c.userId),
  }
}
function toExercise(e: typeof schema.exerciseEntries.$inferSelect): ExerciseDto {
  return {
    id: e.id,
    clientId: e.clientId,
    workoutId: und(e.workoutId),
    date: e.date,
    exercise: e.exercise,
    weightKg: und(e.weightKg),
    reps: und(e.reps),
    sets: und(e.sets),
    note: und(e.note),
  }
}
function toPayment(p: typeof schema.payments.$inferSelect): PaymentDto {
  return { id: p.id, clientId: p.clientId, groupId: und(p.groupId), amount: p.amount, sessions: p.sessions, date: p.date, comment: und(p.comment) }
}
function toWorkout(w: typeof schema.workouts.$inferSelect): WorkoutDto {
  return {
    id: w.id,
    clientId: und(w.clientId),
    groupId: und(w.groupId),
    startsAt: w.startsAt.toISOString(),
    durationMin: w.durationMin,
    status: w.status,
    attendance: und(w.attendance),
    note: und(w.note),
  }
}

async function groupsWithMembers(db: Db, groupRows: (typeof schema.groups.$inferSelect)[]): Promise<GroupDto[]> {
  if (groupRows.length === 0) return []
  const members = await db
    .select()
    .from(schema.groupMembers)
    .where(inArray(schema.groupMembers.groupId, groupRows.map((g) => g.id)))
  return groupRows.map((g) => ({
    id: g.id,
    name: g.name,
    pricePerSession: g.pricePerSession,
    memberIds: members
      .filter((m) => m.groupId === g.id)
      .sort((a, b) => a.position - b.position)
      .map((m) => m.clientId),
    createdAt: g.createdAt.toISOString(),
  }))
}

/** Всё состояние кабинета тренера */
export async function trainerState(db: Db, trainerId: string): Promise<StateDto> {
  const [trainer] = await db.select().from(schema.users).where(eq(schema.users.id, trainerId))
  const [clientRows, groupRows, paymentRows, workoutRows, exerciseRows] = await Promise.all([
    db.select().from(schema.clients).where(eq(schema.clients.trainerId, trainerId)),
    db.select().from(schema.groups).where(eq(schema.groups.trainerId, trainerId)),
    db.select().from(schema.payments).where(eq(schema.payments.trainerId, trainerId)),
    db.select().from(schema.workouts).where(eq(schema.workouts.trainerId, trainerId)),
    db.select().from(schema.exerciseEntries).where(eq(schema.exerciseEntries.trainerId, trainerId)),
  ])
  return {
    trainer: { id: trainer!.id, name: trainer!.name, phone: trainer!.phone },
    clients: clientRows.map(toClient),
    groups: await groupsWithMembers(db, groupRows),
    payments: paymentRows.map(toPayment),
    workouts: workoutRows.map(toWorkout),
    exercises: exerciseRows.map(toExercise),
  }
}

/**
 * Состояние для подопечного: только его карточки, его группы, его оплаты и тренировки.
 * Подопечный может быть заведён у нескольких тренеров; пока берём первого.
 */
export async function clientState(db: Db, userId: string): Promise<StateDto | null> {
  const clientRows = await db.select().from(schema.clients).where(eq(schema.clients.userId, userId))
  const me = clientRows[0]
  if (!me) return null
  const [trainer] = await db.select().from(schema.users).where(eq(schema.users.id, me.trainerId))
  const memberships = await db.select().from(schema.groupMembers).where(eq(schema.groupMembers.clientId, me.id))
  const groupIds = memberships.map((m) => m.groupId)
  const groupRows = groupIds.length ? await db.select().from(schema.groups).where(inArray(schema.groups.id, groupIds)) : []
  const paymentRows = await db.select().from(schema.payments).where(eq(schema.payments.clientId, me.id))
  const workoutRows = await db
    .select()
    .from(schema.workouts)
    .where(
      and(
        eq(schema.workouts.trainerId, me.trainerId),
        groupIds.length ? or(eq(schema.workouts.clientId, me.id), inArray(schema.workouts.groupId, groupIds)) : eq(schema.workouts.clientId, me.id),
      ),
    )
  const exerciseRows = await db.select().from(schema.exerciseEntries).where(eq(schema.exerciseEntries.clientId, me.id))
  return {
    trainer: { id: trainer!.id, name: trainer!.name, phone: trainer!.phone },
    clients: [toClient(me)],
    groups: await groupsWithMembers(db, groupRows),
    payments: paymentRows.map(toPayment),
    workouts: workoutRows.map(toWorkout),
    exercises: exerciseRows.map(toExercise),
  }
}
