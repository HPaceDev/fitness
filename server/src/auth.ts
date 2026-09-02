import bcrypt from 'bcryptjs'
import { randomBytes, randomUUID } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Db } from './db/index.js'
import { schema } from './db/index.js'

export type Role = 'trainer' | 'client' | 'admin'

export interface AuthUser {
  id: string
  role: Role
  name: string
  phone: string
  blocked: boolean
}

const SESSION_DAYS = 60

export const hashPassword = (p: string) => bcrypt.hash(p, 10)
export const checkPassword = (p: string, hash: string) => bcrypt.compare(p, hash)

/** Оставляет только цифры, «8» в начале заменяет на «7» */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1)
  if (d.length === 10) d = '7' + d
  return d
}

export const newId = () => randomUUID()

export async function createSession(db: Db, userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000)
  await db.insert(schema.sessions).values({ token, userId, expiresAt })
  return token
}

export async function destroySession(db: Db, token: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.token, token))
}

export async function userByToken(db: Db, token: string): Promise<AuthUser | null> {
  const rows = await db
    .select({
      id: schema.users.id,
      role: schema.users.role,
      name: schema.users.name,
      phone: schema.users.phone,
      blocked: schema.users.blocked,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.token, token), gt(schema.sessions.expiresAt, new Date())))
    .limit(1)
  const u = rows[0]
  if (!u) return null
  return { ...u, role: u.role as Role }
}

export function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization
  if (!h || !h.startsWith('Bearer ')) return null
  return h.slice(7).trim() || null
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null
    token: string | null
  }
}

/** Хук: подставляет req.user по токену. Не отказывает сам — это делает requireRole. */
export function makeAuthHook(db: Db) {
  return async (req: FastifyRequest) => {
    req.user = null
    req.token = bearer(req)
    if (!req.token) return
    req.user = await userByToken(db, req.token)
  }
}

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) return reply.code(401).send({ error: 'Нужно войти' })
    if (req.user.blocked) return reply.code(403).send({ error: 'Аккаунт заблокирован' })
    if (roles.length && !roles.includes(req.user.role)) return reply.code(403).send({ error: 'Нет доступа' })
  }
}
