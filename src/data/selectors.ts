import type { AppState, Client, ExerciseEntry, Group, Measurement, Workout } from './types'
import { formatDayLong, formatTime, isSameMonth, parseLocal, startOfDay, toDateKey } from '../utils/date'

/** Статусы персональной тренировки, которые списывают занятие с абонемента */
export const CONSUMING_STATUSES: Workout['status'][] = ['done', 'missed']
/** Отметки участника групповой, которые списывают занятие */
export const CONSUMING_ATTENDANCE = ['present', 'missed'] as const

export const clientById = (state: AppState, id?: string): Client | undefined => state.clients.find((c) => c.id === id)
export const groupById = (state: AppState, id?: string): Group | undefined => state.groups.find((g) => g.id === id)
export const clientByUser = (state: AppState, userId: string): Client | undefined => state.clients.find((c) => c.userId === userId)

export const groupsOfClient = (state: AppState, clientId: string): Group[] => state.groups.filter((g) => g.memberIds.includes(clientId))

/** Списывает ли эта тренировка занятие у данного подопечного */
export function consumesFor(w: Workout, clientId: string): boolean {
  if (w.clientId === clientId) return CONSUMING_STATUSES.includes(w.status)
  if (w.groupId && w.status === 'done') {
    const a = w.attendance?.[clientId]
    return !!a && (CONSUMING_ATTENDANCE as readonly string[]).includes(a)
  }
  return false
}

/** Касается ли тренировка подопечного (персональная его или групповая его группы) */
export function involvesClient(state: AppState, w: Workout, clientId: string): boolean {
  if (w.clientId === clientId) return true
  if (w.groupId) {
    if (w.attendance && clientId in w.attendance) return true
    return groupById(state, w.groupId)?.memberIds.includes(clientId) ?? false
  }
  return false
}

/** Абонемент-«кошелёк»: персональные занятия или конкретная группа */
export interface PoolStats {
  key: string
  label: string
  groupId?: string
  price: number
  purchased: number
  used: number
  remaining: number
  debt: number
  planned: number
  lastPaymentDate?: string
}

function poolStats(state: AppState, client: Client, group: Group | undefined, now: Date): PoolStats {
  const gid = group?.id
  const payments = state.payments.filter((p) => p.clientId === client.id && (p.groupId ?? undefined) === gid)
  const purchased = payments.reduce((s, p) => s + p.sessions, 0)

  const workouts = state.workouts.filter((w) => (gid ? w.groupId === gid : w.clientId === client.id))
  const used = workouts.filter((w) => consumesFor(w, client.id)).length
  const planned = workouts.filter((w) => w.status === 'planned' && parseLocal(w.startsAt) >= startOfDay(now)).length

  const price = group ? group.pricePerSession : client.pricePerSession
  const remaining = purchased - used
  const sortedDates = payments.map((p) => p.date).sort()

  return {
    key: gid ?? 'personal',
    label: group ? group.name : 'Персональные',
    groupId: gid,
    price,
    purchased,
    used,
    remaining,
    debt: remaining < 0 ? -remaining * price : 0,
    planned,
    lastPaymentDate: sortedDates[sortedDates.length - 1],
  }
}

export interface ClientStats {
  client: Client
  personal: PoolStats
  groups: PoolStats[]
  /** Все кошельки: персональный + группы */
  pools: PoolStats[]
  remainingTotal: number
  debtTotal: number
  paidTotal: number
  lastPaymentDate?: string
  nextWorkout?: Workout
  /** Есть ли кошелёк, где занятия кончились или ушли в минус */
  hasLow: boolean
}

export function clientStats(state: AppState, client: Client, now = new Date()): ClientStats {
  const personal = poolStats(state, client, undefined, now)
  // Группы, где подопечный состоит, плюс те, за которые платил (на случай исключения из группы)
  const groupIds = new Set<string>(groupsOfClient(state, client.id).map((g) => g.id))
  for (const p of state.payments) if (p.clientId === client.id && p.groupId) groupIds.add(p.groupId)
  const groups = [...groupIds]
    .map((id) => groupById(state, id))
    .filter((g): g is Group => !!g)
    .map((g) => poolStats(state, client, g, now))

  const pools = [personal, ...groups].filter((p) => p.purchased > 0 || p.used > 0 || p.planned > 0 || p.key === 'personal')
  const clientPayments = state.payments.filter((p) => p.clientId === client.id)
  const paidTotal = clientPayments.reduce((s, p) => s + p.amount, 0)
  const sortedDates = clientPayments.map((p) => p.date).sort()

  const nextWorkout = state.workouts
    .filter((w) => w.status === 'planned' && parseLocal(w.startsAt) >= now && involvesClient(state, w, client.id))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]

  return {
    client,
    personal,
    groups,
    pools,
    remainingTotal: pools.reduce((s, p) => s + p.remaining, 0),
    debtTotal: pools.reduce((s, p) => s + p.debt, 0),
    paidTotal,
    lastPaymentDate: sortedDates[sortedDates.length - 1],
    nextWorkout,
    hasLow: pools.some((p) => p.remaining <= 0 && (p.planned > 0 || p.purchased > 0)),
  }
}

export function allClientStats(state: AppState, now = new Date()): ClientStats[] {
  return state.clients.map((c) => clientStats(state, c, now)).sort((a, b) => a.client.name.localeCompare(b.client.name, 'ru'))
}

/** Тренировки, сгруппированные по дням (ключ YYYY-MM-DD), отсортированы по времени */
export function workoutsByDay(state: AppState, from: Date, to: Date, filter?: (w: Workout) => boolean): Map<string, Workout[]> {
  const map = new Map<string, Workout[]>()
  const fromT = startOfDay(from).getTime()
  const toT = startOfDay(to).getTime()
  const sorted = [...state.workouts].filter((w) => !filter || filter(w)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  for (const w of sorted) {
    const d = parseLocal(w.startsAt)
    const dayT = startOfDay(d).getTime()
    if (dayT < fromT || dayT > toT) continue
    const key = toDateKey(d)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(w)
  }
  return map
}

/** Сколько заработано на тренировке (по факту) */
export function workoutEarned(state: AppState, w: Workout): number {
  if (w.clientId) return CONSUMING_STATUSES.includes(w.status) ? (clientById(state, w.clientId)?.pricePerSession ?? 0) : 0
  if (w.groupId && w.status === 'done') {
    const g = groupById(state, w.groupId)
    const n = Object.values(w.attendance ?? {}).filter((a) => (CONSUMING_ATTENDANCE as readonly string[]).includes(a)).length
    return n * (g?.pricePerSession ?? 0)
  }
  return 0
}

/** Сколько ожидается с запланированной тренировки */
export function workoutExpected(state: AppState, w: Workout): number {
  if (w.status !== 'planned') return 0
  if (w.clientId) return clientById(state, w.clientId)?.pricePerSession ?? 0
  if (w.groupId) {
    const g = groupById(state, w.groupId)
    return (g?.memberIds.length ?? 0) * (g?.pricePerSession ?? 0)
  }
  return 0
}

export interface MonthFinance {
  received: number
  paymentsCount: number
  doneSessions: number
  earned: number
  expected: number
  debtTotal: number
  debtors: ClientStats[]
}

export function monthFinance(state: AppState, month: Date): MonthFinance {
  const inMonth = (iso: string) => isSameMonth(parseLocal(iso), month)

  const payments = state.payments.filter((p) => inMonth(p.date))
  const received = payments.reduce((s, p) => s + p.amount, 0)

  const monthWorkouts = state.workouts.filter((w) => inMonth(w.startsAt))
  const done = monthWorkouts.filter((w) => (w.clientId ? CONSUMING_STATUSES.includes(w.status) : w.status === 'done'))
  const earned = monthWorkouts.reduce((s, w) => s + workoutEarned(state, w), 0)
  const expected = monthWorkouts.reduce((s, w) => s + workoutExpected(state, w), 0)

  const stats = allClientStats(state)
  const debtors = stats.filter((s) => s.debtTotal > 0)

  return {
    received,
    paymentsCount: payments.length,
    doneSessions: done.length,
    earned,
    expected,
    debtTotal: debtors.reduce((s, d) => s + d.debtTotal, 0),
    debtors,
  }
}

/* ---------- Прогресс по упражнениям ---------- */

export interface ExerciseProgress {
  exercise: string
  /** Последняя запись */
  last: ExerciseEntry
  /** Предыдущая (для сравнения) */
  prev?: ExerciseEntry
  history: ExerciseEntry[] // от новых к старым
}

const byDateDesc = (a: ExerciseEntry, b: ExerciseEntry) => b.date.localeCompare(a.date)
/** Новее — та, что позже по дате, а при равной дате — добавленная позже (стоит дальше в массиве) */
function sortNewest(state: AppState, list: ExerciseEntry[]): ExerciseEntry[] {
  const idx = new Map(state.exercises.map((e, i) => [e.id, i]))
  return [...list].sort((a, b) => byDateDesc(a, b) || (idx.get(b.id) ?? 0) - (idx.get(a.id) ?? 0))
}

/** Прогресс подопечного, сгруппированный по упражнениям; недавние сверху */
export function exerciseProgress(state: AppState, clientId: string): ExerciseProgress[] {
  const map = new Map<string, ExerciseEntry[]>()
  for (const e of state.exercises) {
    if (e.clientId !== clientId) continue
    const key = e.exercise.trim().toLowerCase()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return [...map.values()]
    .map((list) => {
      const history = sortNewest(state, list)
      return { exercise: history[0]!.exercise, last: history[0]!, prev: history[1], history }
    })
    .sort((a, b) => byDateDesc(a.last, b.last))
}

/** Названия упражнений, которые тренер уже записывал (для подсказок), частые сверху */
export function knownExercises(state: AppState): string[] {
  const freq = new Map<string, { name: string; n: number }>()
  for (const e of state.exercises) {
    const key = e.exercise.trim().toLowerCase()
    const cur = freq.get(key)
    if (cur) cur.n++
    else freq.set(key, { name: e.exercise.trim(), n: 1 })
  }
  return [...freq.values()].sort((a, b) => b.n - a.n).map((x) => x.name)
}

/** Последняя запись подопечного по упражнению (без учёта регистра) */
export function lastEntryFor(state: AppState, clientId: string, exercise: string): ExerciseEntry | undefined {
  const key = exercise.trim().toLowerCase()
  return sortNewest(
    state,
    state.exercises.filter((e) => e.clientId === clientId && e.exercise.trim().toLowerCase() === key),
  )[0]
}

export function formatEntry(e: ExerciseEntry): string {
  const parts: string[] = []
  if (e.weightKg !== undefined && e.weightKg !== null) parts.push(`${e.weightKg} кг`)
  if (e.reps) parts.push(`× ${e.reps}`)
  if (e.sets) parts.push(`· ${e.sets} подх.`)
  return parts.join(' ') || (e.note ?? '')
}

/* ---------- Дни рождения ---------- */

export interface UpcomingBirthday {
  client: Client
  /** Через сколько дней: 0 — сегодня */
  inDays: number
  /** Сколько исполняется, если год известен */
  age?: number
}

/** Дни рождения в ближайшие days дней, сегодняшние первыми */
export function upcomingBirthdays(state: AppState, days = 7, now = new Date()): UpcomingBirthday[] {
  const today = startOfDay(now)
  const out: UpcomingBirthday[] = []
  for (const c of state.clients) {
    if (!c.birthday || c.status === 'paused') continue
    const [y, m, d] = c.birthday.split('-').map(Number)
    if (!m || !d) continue
    let next = new Date(today.getFullYear(), m - 1, d)
    if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d)
    const inDays = Math.round((next.getTime() - today.getTime()) / 86_400_000)
    if (inDays > days) continue
    const age = y && y > 1900 ? next.getFullYear() - y : undefined
    out.push({ client: c, inDays, age })
  }
  return out.sort((a, b) => a.inDays - b.inDays)
}

/* ---------- Оплата: последнее оплаченное занятие ---------- */

export interface PaymentAlert {
  client: Client
  pool: PoolStats
  nextWorkout?: Workout
}

/** У кого абонемент кончился или осталось одно занятие, а тренировки запланированы */
export function paymentAlerts(state: AppState, now = new Date()): PaymentAlert[] {
  const out: PaymentAlert[] = []
  for (const c of state.clients) {
    if (c.status === 'paused') continue
    const st = clientStats(state, c, now)
    for (const pool of st.pools) {
      if (pool.purchased === 0 && pool.used === 0) continue
      if (pool.remaining > 1 || pool.planned === 0) continue
      const next = state.workouts
        .filter((w) => w.status === 'planned' && parseLocal(w.startsAt) >= now && (pool.groupId ? w.groupId === pool.groupId : w.clientId === c.id))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
      out.push({ client: c, pool, nextWorkout: next })
    }
  }
  return out.sort((a, b) => a.pool.remaining - b.pool.remaining)
}

/** Текст напоминания подопечному об оплате */
export function paymentReminderText(state: AppState, alert: PaymentAlert): string {
  const first = alert.client.name.split(' ')[0]
  const what = alert.pool.groupId ? `по группе «${alert.pool.label}»` : 'по персональным тренировкам'
  const left = alert.pool.remaining <= 0 ? `занятия закончились` : `осталось последнее занятие`
  const next = alert.nextWorkout ? `, следующая тренировка ${formatDayLong(parseLocal(alert.nextWorkout.startsAt)).toLowerCase()} в ${formatTime(parseLocal(alert.nextWorkout.startsAt))}` : ''
  const pack = `Продлить: 8 занятий = ${(8 * alert.pool.price).toLocaleString('ru-RU')} ₽, 4 занятия = ${(4 * alert.pool.price).toLocaleString('ru-RU')} ₽.`
  const details = state.trainer?.payDetails ? ` Реквизиты: ${state.trainer.payDetails}.` : ''
  return `${first}, привет! У вас ${left} ${what}${next}. ${pack}${details}`
}

/* ---------- Замеры ---------- */

export const MEASURE_INTERVAL_DAYS = 60

export interface MeasurementStatus {
  first?: Measurement
  last?: Measurement
  prev?: Measurement
  history: Measurement[] // от новых к старым
  daysSince?: number
  /** Пора делать замеры */
  due: boolean
}

export function measurementStatus(state: AppState, client: Client, now = new Date()): MeasurementStatus {
  const history = state.measurements.filter((m) => m.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date))
  const last = history[0]
  const first = history[history.length - 1]
  const daysSince = last ? Math.floor((startOfDay(now).getTime() - parseLocal(last.date).getTime()) / 86_400_000) : undefined
  const sinceCreated = Math.floor((now.getTime() - parseLocal(client.createdAt).getTime()) / 86_400_000)
  const due = client.status !== 'paused' && (last ? daysSince! >= MEASURE_INTERVAL_DAYS : sinceCreated >= 14)
  return { first, last, prev: history[1], history, daysSince, due }
}

/** Кому пора делать замеры */
export function measurementsDue(state: AppState, now = new Date()): { client: Client; status: MeasurementStatus }[] {
  return state.clients
    .map((client) => ({ client, status: measurementStatus(state, client, now) }))
    .filter((x) => x.status.due)
    .sort((a, b) => (b.status.daysSince ?? 9999) - (a.status.daysSince ?? 9999))
}
