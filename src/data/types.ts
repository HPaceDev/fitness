export type ID = string

export type Role = 'trainer' | 'client'

/** Учётная запись. Пароль хранится как есть только в локальном прототипе; на сервере будет хэш. */
export interface User {
  id: ID
  role: Role
  name: string
  phone: string // нормализованный: только цифры
  password: string
  createdAt: string
}

export interface Client {
  id: ID
  name: string
  phone?: string
  /** Цена персонального занятия в рублях */
  pricePerSession: number
  note?: string
  createdAt: string
  /** Связь с учётной записью подопечного, если он зарегистрировался */
  userId?: ID
}

export interface Group {
  id: ID
  name: string
  /** Цена одного группового занятия, одна для всех участников */
  pricePerSession: number
  memberIds: ID[]
  createdAt: string
}

export type PaymentStatus = 'pending' | 'confirmed'

export interface Payment {
  id: ID
  clientId: ID
  /** Абонемент на группу; если не задан — на персональные занятия */
  groupId?: ID
  amount: number
  sessions: number
  date: string // YYYY-MM-DD
  comment?: string
  /** pending — подопечный сообщил об оплате, тренер ещё не подтвердил */
  status: PaymentStatus
}

export type WorkoutStatus = 'planned' | 'done' | 'cancelled' | 'missed'

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
  status: WorkoutStatus
  /** Для групповой: кто был. Заполняется при отметке «проведена». */
  attendance?: Record<ID, Attendance>
  note?: string
}

export interface AppState {
  users: User[]
  clients: Client[]
  groups: Group[]
  payments: Payment[]
  workouts: Workout[]
}
