export type ID = string

export type WorkoutStatus = 'planned' | 'done' | 'cancelled' | 'missed'

export interface Client {
  id: ID
  name: string
  phone?: string
  /** Цена одного занятия в рублях, используется как дефолт при добавлении оплаты */
  pricePerSession: number
  note?: string
  createdAt: string // ISO
}

export interface Payment {
  id: ID
  clientId: ID
  /** Сумма в рублях */
  amount: number
  /** Сколько занятий куплено этой оплатой */
  sessions: number
  date: string // ISO date (YYYY-MM-DD)
  comment?: string
}

export interface Workout {
  id: ID
  clientId: ID
  /** ISO datetime, локальное время */
  startsAt: string
  durationMin: number
  status: WorkoutStatus
  note?: string
}

export interface AppState {
  clients: Client[]
  payments: Payment[]
  workouts: Workout[]
}
