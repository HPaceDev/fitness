import type { AppState } from './types'
import { addDays, startOfDay, toDateKey } from '../utils/date'

function at(dayOffset: number, hour: number, minute = 0): string {
  const d = startOfDay(addDays(new Date(), dayOffset))
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function day(dayOffset: number): string {
  return toDateKey(addDays(new Date(), dayOffset))
}

/** Демо-данные, чтобы прототип сразу выглядел живым */
export function createSeed(): AppState {
  return {
    clients: [
      { id: 'c1', name: 'Анна Смирнова', phone: '+7 916 123-45-67', pricePerSession: 3000, createdAt: day(-40) },
      { id: 'c2', name: 'Игорь Петров', phone: '+7 903 555-10-20', pricePerSession: 2500, createdAt: day(-30) },
      { id: 'c3', name: 'Мария Кузнецова', pricePerSession: 3500, note: 'Колено — без прыжков', createdAt: day(-20) },
      { id: 'c4', name: 'Дмитрий Волков', pricePerSession: 2500, createdAt: day(-5) },
    ],
    payments: [
      { id: 'p1', clientId: 'c1', amount: 24000, sessions: 8, date: day(-35) },
      { id: 'p2', clientId: 'c1', amount: 24000, sessions: 8, date: day(-8) },
      { id: 'p3', clientId: 'c2', amount: 10000, sessions: 4, date: day(-28) },
      { id: 'p4', clientId: 'c3', amount: 35000, sessions: 10, date: day(-18) },
      { id: 'p5', clientId: 'c4', amount: 2500, sessions: 1, date: day(-1), comment: 'Наличными' },
    ],
    workouts: [
      // прошлые
      { id: 'w1', clientId: 'c1', startsAt: at(-7, 9), durationMin: 60, status: 'done' },
      { id: 'w2', clientId: 'c1', startsAt: at(-5, 9), durationMin: 60, status: 'done' },
      { id: 'w3', clientId: 'c1', startsAt: at(-2, 9), durationMin: 60, status: 'done' },
      { id: 'w4', clientId: 'c2', startsAt: at(-6, 18), durationMin: 60, status: 'done' },
      { id: 'w5', clientId: 'c2', startsAt: at(-3, 18), durationMin: 60, status: 'done' },
      { id: 'w6', clientId: 'c2', startsAt: at(-1, 18), durationMin: 60, status: 'missed' },
      { id: 'w7', clientId: 'c3', startsAt: at(-4, 11), durationMin: 90, status: 'done' },
      { id: 'w8', clientId: 'c3', startsAt: at(-1, 11), durationMin: 90, status: 'done' },
      { id: 'w9', clientId: 'c4', startsAt: at(-3, 20), durationMin: 60, status: 'done' },
      // сегодня
      { id: 'w10', clientId: 'c1', startsAt: at(0, 9), durationMin: 60, status: 'done' },
      { id: 'w11', clientId: 'c3', startsAt: at(0, 11), durationMin: 90, status: 'planned' },
      { id: 'w12', clientId: 'c2', startsAt: at(0, 18), durationMin: 60, status: 'planned' },
      { id: 'w13', clientId: 'c4', startsAt: at(0, 20), durationMin: 60, status: 'planned' },
      // ближайшие
      { id: 'w14', clientId: 'c1', startsAt: at(2, 9), durationMin: 60, status: 'planned' },
      { id: 'w15', clientId: 'c3', startsAt: at(2, 11), durationMin: 90, status: 'planned' },
      { id: 'w16', clientId: 'c2', startsAt: at(3, 18), durationMin: 60, status: 'planned' },
      { id: 'w17', clientId: 'c1', startsAt: at(4, 9), durationMin: 60, status: 'planned' },
      { id: 'w18', clientId: 'c4', startsAt: at(5, 20), durationMin: 60, status: 'planned' },
    ],
  }
}
