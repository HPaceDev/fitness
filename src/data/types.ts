export type ID = string

export type Role = 'trainer' | 'client' | 'admin'

export interface User {
  id: ID
  role: Role
  name: string
  phone: string // нормализованный: только цифры
}

export interface Client {
  id: ID
  name: string
  phone?: string
  /** Цена персонального занятия в рублях */
  pricePerSession: number
  note?: string
  /** paused — временно не ходит: не считается в ожидаемом доходе, история сохраняется */
  status?: 'active' | 'paused'
  /** День рождения YYYY-MM-DD, чтобы не забыть поздравить */
  birthday?: string | null
  createdAt: string
  /** Связь с учётной записью подопечного, если он зарегистрировался */
  userId?: ID
  /** Токен ссылки-приглашения, виден только тренеру */
  inviteToken?: string
}

export interface Group {
  id: ID
  name: string
  /** Цена одного группового занятия, одна для всех участников */
  pricePerSession: number
  memberIds: ID[]
  createdAt: string
}

export interface Payment {
  id: ID
  clientId: ID
  /** Абонемент на группу; если не задан — на персональные занятия */
  groupId?: ID
  amount: number
  sessions: number
  date: string // YYYY-MM-DD
  comment?: string
}

export type WorkoutStatus = 'planned' | 'done' | 'cancelled' | 'missed'

/** Вид тренировки */
export type WorkoutKind = 'strength' | 'cardio' | 'functional' | 'stretching' | 'other'

export const KIND_LABEL: Record<WorkoutKind, string> = {
  strength: 'Силовая',
  cardio: 'Кардио',
  functional: 'Функциональная',
  stretching: 'Растяжка',
  other: 'Другое',
}

/** Отметка участника групповой тренировки */
export type Attendance = 'present' | 'missed' | 'excused'

export interface Workout {
  id: ID
  /** Персональная тренировка */
  clientId?: ID
  /** Групповая тренировка */
  groupId?: ID
  startsAt: string // ISO
  durationMin: number
  kind?: WorkoutKind
  status: WorkoutStatus
  /** Для групповой: кто был. Заполняется при отметке «проведена». */
  attendance?: Record<ID, Attendance>
  note?: string
}

/** Запись прогресса: «присед 40 кг × 8, 3 подхода» */
export interface ExerciseEntry {
  id: ID
  clientId: ID
  workoutId?: ID
  date: string // YYYY-MM-DD
  exercise: string
  weightKg?: number
  reps?: number
  sets?: number
  note?: string
}

export interface AppState {
  /** Тренер, чей это кабинет (для подопечного — его тренер) */
  trainer?: { id: ID; name: string; phone: string }
  clients: Client[]
  groups: Group[]
  payments: Payment[]
  workouts: Workout[]
  exercises: ExerciseEntry[]
}
