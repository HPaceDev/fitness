import { eq } from 'drizzle-orm'
import type { Db } from './db/index.js'
import { schema } from './db/index.js'
import { hashPassword, newId } from './auth.js'

export const DEMO_TRAINER_PHONE = '79000000001'
export const DEMO_PASSWORD = '1234'

const day = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}
/** День рождения через offset дней от сегодня, год условный */
const bday = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `1995-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const at = (offset: number, h: number, m = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(h, m, 0, 0)
  return d
}

/** Создаёт демо-тренера с подопечными, если его ещё нет. Включается переменной DEMO=1. */
export async function seedDemo(db: Db) {
  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.phone, DEMO_TRAINER_PHONE))
  if (exists) return false

  const hash = await hashPassword(DEMO_PASSWORD)
  const tid = newId()
  const anna = newId()
  const igor = newId()
  await db.insert(schema.users).values([
    { id: tid, role: 'trainer', name: 'Алексей Громов', phone: DEMO_TRAINER_PHONE, passwordHash: hash, payDetails: 'Сбер по номеру +7 900 000-00-01, Алексей Г.' },
    { id: anna, role: 'client', name: 'Анна Смирнова', phone: '79161234567', passwordHash: hash },
    { id: igor, role: 'client', name: 'Игорь Петров', phone: '79035551020', passwordHash: hash },
  ])

  const c = { c1: newId(), c2: newId(), c3: newId(), c4: newId(), c5: newId() }
  await db.insert(schema.clients).values([
    { id: c.c1, trainerId: tid, name: 'Анна Смирнова', phone: '79161234567', pricePerSession: 3000, userId: anna, birthday: bday(2) },
    { id: c.c2, trainerId: tid, name: 'Игорь Петров', phone: '79035551020', pricePerSession: 2500, userId: igor },
    { id: c.c3, trainerId: tid, name: 'Мария Кузнецова', phone: '79261112233', pricePerSession: 3500, note: 'Колено — без прыжков', birthday: bday(0) },
    { id: c.c4, trainerId: tid, name: 'Дмитрий Волков', pricePerSession: 2500 },
    { id: c.c5, trainerId: tid, name: 'Ольга Лебедева', phone: '79157778899', pricePerSession: 3000 },
  ])

  const g1 = newId()
  const g2 = newId()
  await db.insert(schema.groups).values([
    { id: g1, trainerId: tid, name: 'Утренняя функционалка', pricePerSession: 1500 },
    { id: g2, trainerId: tid, name: 'Вечерняя сила', pricePerSession: 1200 },
  ])
  await db.insert(schema.groupMembers).values([
    { groupId: g1, clientId: c.c1, position: 0 },
    { groupId: g1, clientId: c.c3, position: 1 },
    { groupId: g1, clientId: c.c5, position: 2 },
    { groupId: g2, clientId: c.c2, position: 0 },
    { groupId: g2, clientId: c.c4, position: 1 },
  ])

  const pay = (clientId: string, amount: number, sessions: number, date: string, groupId?: string, comment?: string) => ({
    id: newId(),
    trainerId: tid,
    clientId,
    groupId: groupId ?? null,
    amount,
    sessions,
    date,
    comment: comment ?? null,
  })
  await db.insert(schema.payments).values([
    pay(c.c1, 24000, 8, day(-35)),
    pay(c.c1, 24000, 8, day(-8)),
    pay(c.c2, 10000, 4, day(-28)),
    pay(c.c3, 35000, 10, day(-18)),
    pay(c.c4, 2500, 1, day(-1), undefined, 'Наличными'),
    pay(c.c1, 12000, 8, day(-22), g1),
    pay(c.c3, 12000, 8, day(-22), g1),
    pay(c.c5, 6000, 4, day(-14), g1),
    pay(c.c2, 9600, 8, day(-10), g2),
  ])

  type Att = Record<string, 'present' | 'missed' | 'excused'>
  const w = (clientId: string | null, groupId: string | null, startsAt: Date, durationMin: number, status: string, attendance?: Att) => ({
    id: newId(),
    trainerId: tid,
    clientId,
    groupId,
    startsAt,
    durationMin,
    kind: groupId ? 'functional' : durationMin >= 90 ? 'strength' : startsAt.getHours() >= 18 ? 'cardio' : 'strength',
    status,
    attendance: attendance ?? null,
  })
  await db.insert(schema.workouts).values([
    w(c.c1, null, at(-7, 9), 60, 'done'),
    w(c.c1, null, at(-5, 9), 60, 'done'),
    w(c.c1, null, at(-2, 9), 60, 'done'),
    w(c.c2, null, at(-6, 18), 60, 'done'),
    w(c.c2, null, at(-3, 18), 60, 'done'),
    w(c.c2, null, at(-1, 18), 60, 'missed'),
    w(c.c3, null, at(-4, 11), 90, 'done'),
    w(c.c3, null, at(-1, 11), 90, 'done'),
    w(c.c4, null, at(-3, 20), 60, 'done'),
    w(null, g1, at(-9, 7, 30), 60, 'done', { [c.c1]: 'present', [c.c3]: 'present', [c.c5]: 'present' }),
    w(null, g1, at(-6, 7, 30), 60, 'done', { [c.c1]: 'present', [c.c3]: 'missed', [c.c5]: 'present' }),
    w(null, g1, at(-2, 7, 30), 60, 'done', { [c.c1]: 'present', [c.c3]: 'present', [c.c5]: 'excused' }),
    w(null, g2, at(-5, 19, 30), 60, 'done', { [c.c2]: 'present', [c.c4]: 'present' }),
    w(null, g2, at(-2, 19, 30), 60, 'done', { [c.c2]: 'present', [c.c4]: 'missed' }),
    w(null, g1, at(0, 7, 30), 60, 'done', { [c.c1]: 'present', [c.c3]: 'present', [c.c5]: 'present' }),
    w(c.c1, null, at(0, 9), 60, 'done'),
    w(c.c3, null, at(0, 11), 90, 'planned'),
    w(c.c2, null, at(0, 18), 60, 'planned'),
    w(null, g2, at(0, 19, 30), 60, 'planned'),
    w(null, g1, at(2, 7, 30), 60, 'planned'),
    w(c.c1, null, at(2, 9), 60, 'planned'),
    w(c.c3, null, at(2, 11), 90, 'planned'),
    w(null, g2, at(3, 19, 30), 60, 'planned'),
    w(c.c2, null, at(3, 18), 60, 'planned'),
    w(null, g1, at(4, 7, 30), 60, 'planned'),
    w(c.c1, null, at(4, 9), 60, 'planned'),
    w(c.c4, null, at(5, 20), 60, 'planned'),
  ])
  const ex = (clientId: string, dayOffset: number, exercise: string, weightKg: number, reps: number, sets = 3) => ({
    id: newId(),
    trainerId: tid,
    clientId,
    date: day(dayOffset),
    exercise,
    weightKg,
    reps,
    sets,
  })
  await db.insert(schema.exerciseEntries).values([
    ex(c.c1, -7, 'Присед со штангой', 35, 10),
    ex(c.c1, -7, 'Тяга верхнего блока', 30, 12),
    ex(c.c1, -5, 'Присед со штангой', 40, 8),
    ex(c.c1, -5, 'Жим гантелей лёжа', 12, 10),
    ex(c.c1, -2, 'Присед со штангой', 40, 10),
    ex(c.c1, -2, 'Тяга верхнего блока', 32.5, 12),
    ex(c.c1, 0, 'Присед со штангой', 42.5, 8),
    ex(c.c3, -4, 'Румынская тяга', 40, 10),
    ex(c.c3, -1, 'Румынская тяга', 45, 10),
    ex(c.c3, -1, 'Жим ногами', 80, 12),
  ])
  const ms = (clientId: string, dayOffset: number, v: Partial<{ weightKg: number; chest: number; waist: number; belly: number; sides: number; hips: number; thigh: number; biceps: number }>) => ({
    id: newId(),
    trainerId: tid,
    clientId,
    date: day(dayOffset),
    weightKg: v.weightKg ?? null,
    chest: v.chest ?? null,
    waist: v.waist ?? null,
    belly: v.belly ?? null,
    sides: v.sides ?? null,
    hips: v.hips ?? null,
    thigh: v.thigh ?? null,
    biceps: v.biceps ?? null,
  })
  await db.insert(schema.measurements).values([
    ms(c.c1, -40, { weightKg: 64.5, chest: 90, waist: 72, belly: 80, sides: 84, hips: 98, thigh: 57, biceps: 27 }),
    ms(c.c1, -5, { weightKg: 62.8, chest: 89, waist: 69, belly: 76, sides: 81, hips: 97, thigh: 56, biceps: 27.5 }),
    ms(c.c3, -75, { weightKg: 71, chest: 94, waist: 78, belly: 88, hips: 104, thigh: 60, biceps: 29 }),
    ms(c.c2, -30, { weightKg: 84, chest: 101, waist: 88, belly: 92, hips: 100, thigh: 58, biceps: 34 }),
  ])
  return true
}

/** Администратор сервиса из переменных окружения ADMIN_PHONE / ADMIN_PASSWORD */
export async function ensureAdmin(db: Db) {
  const phone = process.env.ADMIN_PHONE?.replace(/\D/g, '')
  const password = process.env.ADMIN_PASSWORD
  if (!phone || !password) return
  const [u] = await db.select().from(schema.users).where(eq(schema.users.phone, phone))
  if (u) {
    if (u.role !== 'admin') await db.update(schema.users).set({ role: 'admin' }).where(eq(schema.users.id, u.id))
    return
  }
  await db.insert(schema.users).values({ id: newId(), role: 'admin', name: 'Администратор', phone, passwordHash: await hashPassword(password) })
}
