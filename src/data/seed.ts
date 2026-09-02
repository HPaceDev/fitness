import type { AppState } from './types'
import { addDays, startOfDay, toDateKey } from '../utils/date'

function at(dayOffset: number, hour: number, minute = 0): string {
  const d = startOfDay(addDays(new Date(), dayOffset))
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}
const day = (offset: number) => toDateKey(addDays(new Date(), offset))

export const DEMO_PASSWORD = '1234'

/** Демо-данные, чтобы прототип сразу выглядел живым */
export function createSeed(): AppState {
  return {
    users: [
      { id: 'u_t', role: 'trainer', name: 'Алексей Громов', phone: '79000000001', password: DEMO_PASSWORD, createdAt: day(-60) },
      { id: 'u_c1', role: 'client', name: 'Анна Смирнова', phone: '79161234567', password: DEMO_PASSWORD, createdAt: day(-40) },
      { id: 'u_c2', role: 'client', name: 'Игорь Петров', phone: '79035551020', password: DEMO_PASSWORD, createdAt: day(-30) },
    ],
    clients: [
      { id: 'c1', name: 'Анна Смирнова', phone: '79161234567', pricePerSession: 3000, createdAt: day(-40), userId: 'u_c1' },
      { id: 'c2', name: 'Игорь Петров', phone: '79035551020', pricePerSession: 2500, createdAt: day(-30), userId: 'u_c2' },
      { id: 'c3', name: 'Мария Кузнецова', phone: '79261112233', pricePerSession: 3500, note: 'Колено — без прыжков', createdAt: day(-20) },
      { id: 'c4', name: 'Дмитрий Волков', pricePerSession: 2500, createdAt: day(-5) },
      { id: 'c5', name: 'Ольга Лебедева', phone: '79157778899', pricePerSession: 3000, createdAt: day(-15) },
    ],
    groups: [
      { id: 'g1', name: 'Утренняя функционалка', pricePerSession: 1500, memberIds: ['c1', 'c3', 'c5'], createdAt: day(-25) },
      { id: 'g2', name: 'Вечерняя сила', pricePerSession: 1200, memberIds: ['c2', 'c4'], createdAt: day(-12) },
    ],
    payments: [
      // персональные
      { id: 'p1', clientId: 'c1', amount: 24000, sessions: 8, date: day(-35) },
      { id: 'p2', clientId: 'c1', amount: 24000, sessions: 8, date: day(-8) },
      { id: 'p3', clientId: 'c2', amount: 10000, sessions: 4, date: day(-28) },
      { id: 'p4', clientId: 'c3', amount: 35000, sessions: 10, date: day(-18) },
      { id: 'p5', clientId: 'c4', amount: 2500, sessions: 1, date: day(-1), comment: 'Наличными' },
      // групповые
      { id: 'p6', clientId: 'c1', groupId: 'g1', amount: 12000, sessions: 8, date: day(-22) },
      { id: 'p7', clientId: 'c3', groupId: 'g1', amount: 12000, sessions: 8, date: day(-22) },
      { id: 'p8', clientId: 'c5', groupId: 'g1', amount: 6000, sessions: 4, date: day(-14) },
      { id: 'p9', clientId: 'c2', groupId: 'g2', amount: 9600, sessions: 8, date: day(-10) },
    ],
    workouts: [
      // персональные, прошлые
      { id: 'w1', clientId: 'c1', startsAt: at(-7, 9), durationMin: 60, status: 'done' },
      { id: 'w2', clientId: 'c1', startsAt: at(-5, 9), durationMin: 60, status: 'done' },
      { id: 'w3', clientId: 'c1', startsAt: at(-2, 9), durationMin: 60, status: 'done' },
      { id: 'w4', clientId: 'c2', startsAt: at(-6, 18), durationMin: 60, status: 'done' },
      { id: 'w5', clientId: 'c2', startsAt: at(-3, 18), durationMin: 60, status: 'done' },
      { id: 'w6', clientId: 'c2', startsAt: at(-1, 18), durationMin: 60, status: 'missed' },
      { id: 'w7', clientId: 'c3', startsAt: at(-4, 11), durationMin: 90, status: 'done' },
      { id: 'w8', clientId: 'c3', startsAt: at(-1, 11), durationMin: 90, status: 'done' },
      { id: 'w9', clientId: 'c4', startsAt: at(-3, 20), durationMin: 60, status: 'done' },
      // групповые, прошлые
      { id: 'gw1', groupId: 'g1', startsAt: at(-9, 7, 30), durationMin: 60, status: 'done', attendance: { c1: 'present', c3: 'present', c5: 'present' } },
      { id: 'gw2', groupId: 'g1', startsAt: at(-6, 7, 30), durationMin: 60, status: 'done', attendance: { c1: 'present', c3: 'missed', c5: 'present' } },
      { id: 'gw3', groupId: 'g1', startsAt: at(-2, 7, 30), durationMin: 60, status: 'done', attendance: { c1: 'present', c3: 'present', c5: 'excused' } },
      { id: 'gw4', groupId: 'g2', startsAt: at(-5, 19, 30), durationMin: 60, status: 'done', attendance: { c2: 'present', c4: 'present' } },
      { id: 'gw5', groupId: 'g2', startsAt: at(-2, 19, 30), durationMin: 60, status: 'done', attendance: { c2: 'present', c4: 'missed' } },
      // сегодня
      { id: 'gw6', groupId: 'g1', startsAt: at(0, 7, 30), durationMin: 60, status: 'done', attendance: { c1: 'present', c3: 'present', c5: 'present' } },
      { id: 'w10', clientId: 'c1', startsAt: at(0, 9), durationMin: 60, status: 'done' },
      { id: 'w11', clientId: 'c3', startsAt: at(0, 11), durationMin: 90, status: 'planned' },
      { id: 'w12', clientId: 'c2', startsAt: at(0, 18), durationMin: 60, status: 'planned' },
      { id: 'gw7', groupId: 'g2', startsAt: at(0, 19, 30), durationMin: 60, status: 'planned' },
      // ближайшие
      { id: 'gw8', groupId: 'g1', startsAt: at(2, 7, 30), durationMin: 60, status: 'planned' },
      { id: 'w14', clientId: 'c1', startsAt: at(2, 9), durationMin: 60, status: 'planned' },
      { id: 'w15', clientId: 'c3', startsAt: at(2, 11), durationMin: 90, status: 'planned' },
      { id: 'gw9', groupId: 'g2', startsAt: at(3, 19, 30), durationMin: 60, status: 'planned' },
      { id: 'w16', clientId: 'c2', startsAt: at(3, 18), durationMin: 60, status: 'planned' },
      { id: 'gw10', groupId: 'g1', startsAt: at(4, 7, 30), durationMin: 60, status: 'planned' },
      { id: 'w17', clientId: 'c1', startsAt: at(4, 9), durationMin: 60, status: 'planned' },
      { id: 'w18', clientId: 'c4', startsAt: at(5, 20), durationMin: 60, status: 'planned' },
    ],
  }
}
