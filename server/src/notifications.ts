import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import type { Db } from './db/index.js'
import { schema } from './db/index.js'
import { sendMessage, telegramEnabled } from './telegram.js'

/**
 * Планировщик уведомлений. Раз в минуту смотрит, что пора отправить,
 * и помнит отправленное в таблице notifications_sent, чтобы не повторяться.
 * Время — локальное серверу (TZ в docker-compose, по умолчанию Europe/Moscow).
 */

const KIND_LABEL: Record<string, string> = { strength: 'силовая', cardio: 'кардио', functional: 'функциональная', stretching: 'растяжка', other: '' }
const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function once(db: Db, key: string, fn: () => Promise<void>) {
  const [row] = await db.select().from(schema.notificationsSent).where(eq(schema.notificationsSent.key, key))
  if (row) return
  await db.insert(schema.notificationsSent).values({ key })
  await fn()
}

async function chatOfUser(db: Db, userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null
  const [u] = await db.select({ chat: schema.users.telegramChatId }).from(schema.users).where(eq(schema.users.id, userId))
  return u?.chat ?? null
}

/** Кому из подопечных адресована тренировка: [clientId, userId][] */
async function recipientsOf(db: Db, w: typeof schema.workouts.$inferSelect): Promise<{ clientId: string; userId: string | null; name: string }[]> {
  if (w.clientId) {
    const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, w.clientId))
    return c ? [{ clientId: c.id, userId: c.userId, name: c.name }] : []
  }
  if (w.groupId) {
    const members = await db.select().from(schema.groupMembers).where(eq(schema.groupMembers.groupId, w.groupId))
    if (!members.length) return []
    const cs = await db.select().from(schema.clients).where(inArray(schema.clients.id, members.map((m) => m.clientId)))
    return cs.map((c) => ({ clientId: c.id, userId: c.userId, name: c.name }))
  }
  return []
}

async function describe(db: Db, w: typeof schema.workouts.$inferSelect): Promise<string> {
  const kind = KIND_LABEL[w.kind] ?? ''
  if (w.groupId) {
    const [g] = await db.select().from(schema.groups).where(eq(schema.groups.id, w.groupId))
    return `${esc(g?.name ?? 'группа')}${kind ? `, ${kind}` : ''}`
  }
  return `персональная${kind ? `, ${kind}` : ''}`
}

/** Подопечным: за 2 часа до тренировки */
async function remindSoon(db: Db, now: Date) {
  const to = new Date(now.getTime() + 120 * 60_000)
  const rows = await db
    .select()
    .from(schema.workouts)
    .where(and(eq(schema.workouts.status, 'planned'), gte(schema.workouts.startsAt, now), lte(schema.workouts.startsAt, to)))
  for (const w of rows) {
    const [trainer] = await db.select().from(schema.users).where(eq(schema.users.id, w.trainerId))
    for (const r of await recipientsOf(db, w)) {
      const chat = await chatOfUser(db, r.userId)
      if (!chat) continue
      await once(db, `soon:${w.id}:${r.clientId}`, async () => {
        await sendMessage(chat, `⏰ Через два часа тренировка: <b>${hhmm(w.startsAt)}</b>, ${await describe(db, w)}. Тренер ${esc(trainer?.name ?? '')}.`)
      })
    }
  }
}

/** Вечером в 20:00: подопечным — тренировка завтра, тренеру — план на завтра */
async function eveningDigest(db: Db, now: Date) {
  if (now.getHours() !== 20) return
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const end = new Date(start.getTime() + 86_400_000)
  const rows = await db
    .select()
    .from(schema.workouts)
    .where(and(eq(schema.workouts.status, 'planned'), gte(schema.workouts.startsAt, start), lte(schema.workouts.startsAt, end)))
  const byTrainer = new Map<string, string[]>()
  for (const w of rows.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())) {
    const recipients = await recipientsOf(db, w)
    const desc = await describe(db, w)
    for (const r of recipients) {
      const chat = await chatOfUser(db, r.userId)
      if (!chat) continue
      await once(db, `tomorrow:${w.id}:${r.clientId}`, async () => {
        await sendMessage(chat, `📅 Завтра тренировка в <b>${hhmm(w.startsAt)}</b>, ${desc}.`)
      })
    }
    const who = w.clientId ? esc(recipients[0]?.name ?? '') : desc
    const list = byTrainer.get(w.trainerId) ?? []
    list.push(`${hhmm(w.startsAt)} · ${who}${w.groupId ? ` (${recipients.length} чел.)` : ''}`)
    byTrainer.set(w.trainerId, list)
  }
  for (const [trainerId, list] of byTrainer) {
    const chat = await chatOfUser(db, trainerId)
    if (!chat) continue
    await once(db, `digest:${trainerId}:${dateKey(start)}`, async () => {
      await sendMessage(chat, `📋 Завтра ${list.length} тренир.:\n${list.join('\n')}`)
    })
  }
}

/** Утром в 09:00 тренеру: дни рождения сегодня и через 3 дня */
async function birthdays(db: Db, now: Date) {
  if (now.getHours() !== 9) return
  const clients = await db.select().from(schema.clients)
  for (const c of clients) {
    if (!c.birthday || c.status === 'paused') continue
    const [y, m, d] = c.birthday.split('-').map(Number)
    for (const inDays of [0, 3]) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + inDays)
      if (day.getMonth() + 1 !== m || day.getDate() !== d) continue
      const chat = await chatOfUser(db, c.trainerId)
      if (!chat) continue
      const age = y && y > 1900 ? day.getFullYear() - y : null
      await once(db, `bday:${c.id}:${day.getFullYear()}:${inDays}`, async () => {
        await sendMessage(
          chat,
          inDays === 0
            ? `🎂 Сегодня день рождения у <b>${esc(c.name)}</b>${age ? `, исполняется ${age}` : ''}. Самое время поздравить!`
            : `🎂 Через 3 дня день рождения у <b>${esc(c.name)}</b>${age ? `, исполняется ${age}` : ''}.`,
        )
      })
    }
  }
}

/** Днём в 10:00: у кого абонемент кончился или осталось 1 занятие, а тренировки запланированы */
async function lowBalance(db: Db, now: Date) {
  if (now.getHours() !== 10) return
  const clients = await db.select().from(schema.clients)
  for (const c of clients) {
    if (c.status === 'paused') continue
    const payments = await db.select().from(schema.payments).where(eq(schema.payments.clientId, c.id))
    const memberships = await db.select().from(schema.groupMembers).where(eq(schema.groupMembers.clientId, c.id))
    const groupIds = memberships.map((m) => m.groupId)
    const workouts = await db.select().from(schema.workouts).where(eq(schema.workouts.trainerId, c.trainerId))
    const pools: { key: string; label: string; groupId?: string }[] = [{ key: 'personal', label: 'персональные' }]
    if (groupIds.length) {
      const gs = await db.select().from(schema.groups).where(inArray(schema.groups.id, groupIds))
      for (const g of gs) pools.push({ key: g.id, label: g.name, groupId: g.id })
    }
    for (const p of pools) {
      const purchased = payments.filter((x) => (x.groupId ?? undefined) === p.groupId).reduce((s, x) => s + x.sessions, 0)
      const relevant = workouts.filter((w) => (p.groupId ? w.groupId === p.groupId : w.clientId === c.id))
      const used = relevant.filter((w) => {
        if (w.clientId) return w.status === 'done' || w.status === 'missed'
        const a = w.attendance?.[c.id]
        return w.status === 'done' && (a === 'present' || a === 'missed')
      }).length
      const planned = relevant.filter((w) => w.status === 'planned' && w.startsAt >= now).length
      const remaining = purchased - used
      if (purchased === 0 || remaining > 1 || planned === 0) continue
      const text =
        remaining <= 0
          ? `Абонемент (${esc(p.label)}) закончился: осталось ${remaining} занятий, а запланировано ${planned}.`
          : `По абонементу (${esc(p.label)}) осталось 1 занятие, запланировано ${planned}.`
      const key = `low:${c.id}:${p.key}:${remaining}:${purchased}`
      const clientChat = await chatOfUser(db, c.userId)
      if (clientChat) await once(db, `${key}:client`, () => sendMessage(clientChat, `💳 ${text} Пора продлить.`).then(() => undefined))
      const trainerChat = await chatOfUser(db, c.trainerId)
      if (trainerChat) await once(db, `${key}:trainer`, () => sendMessage(trainerChat, `💳 <b>${esc(c.name)}</b>: ${text}`).then(() => undefined))
    }
  }
}

/** По понедельникам в 10:00 тренеру: кому пора делать замеры (прошло 60 дней или их не было) */
export const MEASURE_INTERVAL_DAYS = 60
async function measurementsDue(db: Db, now: Date) {
  if (now.getDay() !== 1 || now.getHours() !== 10) return
  const clients = await db.select().from(schema.clients)
  const all = await db.select({ clientId: schema.measurements.clientId, date: schema.measurements.date }).from(schema.measurements)
  const byTrainer = new Map<string, string[]>()
  for (const c of clients) {
    if (c.status === 'paused') continue
    const dates = all.filter((m) => m.clientId === c.id).map((m) => m.date).sort()
    const last = dates[dates.length - 1]
    const ageDays = last ? (now.getTime() - new Date(last).getTime()) / 86_400_000 : (now.getTime() - c.createdAt.getTime()) / 86_400_000
    if (last ? ageDays < MEASURE_INTERVAL_DAYS : ageDays < 14) continue
    const list = byTrainer.get(c.trainerId) ?? []
    list.push(`${esc(c.name)} — ${last ? `последние ${Math.floor(ageDays)} дн. назад` : 'начальных замеров нет'}`)
    byTrainer.set(c.trainerId, list)
  }
  for (const [trainerId, list] of byTrainer) {
    const chat = await chatOfUser(db, trainerId)
    if (!chat) continue
    await once(db, `measure:${trainerId}:${dateKey(now)}`, async () => {
      await sendMessage(chat, `📏 Пора сделать замеры:\n${list.join('\n')}`)
    })
  }
}

export function startNotifications(db: Db) {
  if (!telegramEnabled) return
  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    const now = new Date()
    try {
      await remindSoon(db, now)
      await eveningDigest(db, now)
      await birthdays(db, now)
      await lowBalance(db, now)
      await measurementsDue(db, now)
    } catch (e) {
      console.warn('notifications', (e as Error).message)
    } finally {
      busy = false
    }
  }
  setInterval(() => void tick(), 60_000)
  void tick()
}
