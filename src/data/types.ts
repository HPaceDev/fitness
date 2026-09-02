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

/** Замер подопечного: первая запись — начальные данные. Сантиметры, вес в кг */
export interface Measurement {
  id: ID
  clientId: ID
  date: string
  weightKg?: number
  chest?: number
  waist?: number
  belly?: number
  sides?: number
  hips?: number
  thigh?: number
  biceps?: number
  note?: string
}
export type MeasureKey = 'weightKg' | 'chest' | 'waist' | 'belly' | 'sides' | 'hips' | 'thigh' | 'biceps'
export const MEASURE_FIELDS: { key: MeasureKey; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'Вес', unit: 'кг' },
  { key: 'chest', label: 'Грудь', unit: 'см' },
  { key: 'waist', label: 'Талия', unit: 'см' },
  { key: 'belly', label: 'Живот', unit: 'см' },
  { key: 'sides', label: 'Бока', unit: 'см' },
  { key: 'hips', label: 'Попа', unit: 'см' },
  { key: 'thigh', label: 'Нога', unit: 'см' },
  { key: 'biceps', label: 'Бицепс', unit: 'см' },
]

export interface AppState {
  /** Тренер, чей это кабинет (для подопечного — его тренер) */
  trainer?: { id: ID; name: string; phone: string; payDetails?: string }
  clients: Client[]
  groups: Group[]
  payments: Payment[]
  workouts: Workout[]
  exercises: ExerciseEntry[]
  measurements: Measurement[]
}
