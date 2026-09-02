import { boolean, date, integer, jsonb, pgTable, primaryKey, real, text, timestamp } from 'drizzle-orm/pg-core'

/** Учётные записи всех ролей: тренер, подопечный, администратор сервиса */
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  role: text('role').notNull(), // 'trainer' | 'client' | 'admin'
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(), // только цифры, 7XXXXXXXXXX
  passwordHash: text('password_hash').notNull(),
  blocked: boolean('blocked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
})

export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

/** Карточка подопечного в кабинете конкретного тренера */
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  trainerId: text('trainer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  pricePerSession: integer('price_per_session').notNull(),
  note: text('note'),
  status: text('status').notNull().default('active'), // 'active' | 'paused'
  /** День рождения, чтобы тренер не забыл поздравить */
  birthday: date('birthday'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  /** Учётная запись подопечного, если он зарегистрировался */
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
})

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  trainerId: text('trainer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  pricePerSession: integer('price_per_session').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.clientId] })],
)

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  trainerId: text('trainer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  groupId: text('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  sessions: integer('sessions').notNull(),
  date: date('date').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const workouts = pgTable('workouts', {
  id: text('id').primaryKey(),
  trainerId: text('trainer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  groupId: text('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  durationMin: integer('duration_min').notNull(),
  status: text('status').notNull().default('planned'),
  attendance: jsonb('attendance').$type<Record<string, 'present' | 'missed' | 'excused'>>(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Прогресс по упражнениям: «в прошлый раз Анна делала присед 40 кг × 8».
 * Названия упражнений — свободный текст тренера, подсказки строятся из его же записей.
 */
export const exerciseEntries = pgTable('exercise_entries', {
  id: text('id').primaryKey(),
  trainerId: text('trainer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  workoutId: text('workout_id').references(() => workouts.id, { onDelete: 'set null' }),
  date: date('date').notNull(),
  exercise: text('exercise').notNull(),
  weightKg: real('weight_kg'),
  reps: integer('reps'),
  sets: integer('sets'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
