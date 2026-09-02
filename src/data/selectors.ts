import type { AppState, Client, Workout } from './types'
import { isSameMonth, parseLocal, startOfDay, toDateKey } from '../utils/date'

/** Статусы, которые списывают занятие с абонемента */
export const CONSUMING_STATUSES: Workout['status'][] = ['done', 'missed']

export interface ClientStats {
  client: Client
  purchasedSessions: number
  usedSessions: number
  /** Может быть отрицательным — значит клиент занимается в долг */
  remainingSessions: number
  paidTotal: number
  /** Сумма долга за занятия сверх оплаченных, по цене клиента */
  debt: number
  plannedSessions: number
  lastPaymentDate?: string
  nextWorkout?: Workout
}

export function clientStats(state: AppState, client: Client, now = new Date()): ClientStats {
  const payments = state.payments.filter((p) => p.clientId === client.id)
  const workouts = state.workouts.filter((w) => w.clientId === client.id)

  const purchasedSessions = payments.reduce((s, p) => s + p.sessions, 0)
  const usedSessions = workouts.filter((w) => CONSUMING_STATUSES.includes(w.status)).length
  const remainingSessions = purchasedSessions - usedSessions
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0)
  const debt = remainingSessions < 0 ? -remainingSessions * client.pricePerSession : 0
  const plannedSessions = workouts.filter((w) => w.status === 'planned').length

  const sortedDates = payments.map((p) => p.date).sort()
  const lastPaymentDate = sortedDates[sortedDates.length - 1]
  const nextWorkout = workouts
    .filter((w) => w.status === 'planned' && parseLocal(w.startsAt) >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]

  return {
    client,
    purchasedSessions,
    usedSessions,
    remainingSessions,
    paidTotal,
    debt,
    plannedSessions,
    lastPaymentDate,
    nextWorkout,
  }
}

export function allClientStats(state: AppState, now = new Date()): ClientStats[] {
  return state.clients
    .map((c) => clientStats(state, c, now))
    .sort((a, b) => a.client.name.localeCompare(b.client.name, 'ru'))
}

export function clientById(state: AppState, id: string): Client | undefined {
  return state.clients.find((c) => c.id === id)
}

/** Тренировки, сгруппированные по дням (ключ YYYY-MM-DD), отсортированы по времени */
export function workoutsByDay(state: AppState, from: Date, to: Date): Map<string, Workout[]> {
  const map = new Map<string, Workout[]>()
  const fromT = startOfDay(from).getTime()
  const toT = startOfDay(to).getTime()
  const sorted = [...state.workouts].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
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

export interface MonthFinance {
  received: number
  paymentsCount: number
  doneSessions: number
  /** Стоимость проведённых занятий по цене клиента — сколько заработано */
  earned: number
  /** Стоимость запланированных занятий в этом месяце */
  expected: number
  debtTotal: number
  debtors: ClientStats[]
}

export function monthFinance(state: AppState, month: Date): MonthFinance {
  const inMonth = (iso: string) => isSameMonth(parseLocal(iso), month)
  const priceOf = (clientId: string) => clientById(state, clientId)?.pricePerSession ?? 0

  const payments = state.payments.filter((p) => inMonth(p.date))
  const received = payments.reduce((s, p) => s + p.amount, 0)

  const done = state.workouts.filter((w) => inMonth(w.startsAt) && CONSUMING_STATUSES.includes(w.status))
  const earned = done.reduce((s, w) => s + priceOf(w.clientId), 0)

  const planned = state.workouts.filter((w) => inMonth(w.startsAt) && w.status === 'planned')
  const expected = planned.reduce((s, w) => s + priceOf(w.clientId), 0)

  const stats = allClientStats(state)
  const debtors = stats.filter((s) => s.debt > 0)
  const debtTotal = debtors.reduce((s, d) => s + d.debt, 0)

  return {
    received,
    paymentsCount: payments.length,
    doneSessions: done.length,
    earned,
    expected,
    debtTotal,
    debtors,
  }
}
