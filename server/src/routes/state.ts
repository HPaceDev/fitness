import type { FastifyInstance } from 'fastify'
import type { Db } from '../db/index.js'
import { requireRole } from '../auth.js'
import { ActionError, ActionSchema, applyAction } from '../actions.js'
import { clientState, trainerState } from '../state.js'

export function stateRoutes(app: FastifyInstance, db: Db) {
  /** Состояние кабинета: тренеру — всё его, подопечному — только его */
  app.get('/api/state', { preHandler: requireRole('trainer', 'client') }, async (req, reply) => {
    const u = req.user!
    if (u.role === 'trainer') return trainerState(db, u.id)
    const s = await clientState(db, u.id)
    if (!s) return reply.code(404).send({ error: 'Тренер ещё не добавил вас в свой список' })
    return s
  })

  /** Действие тренера. Возвращает свежее состояние. */
  app.post('/api/actions', { preHandler: requireRole('trainer') }, async (req, reply) => {
    const parsed = ActionSchema.safeParse(req.body)
    if (!parsed.success) {
      req.log.warn({ issues: parsed.error.issues }, 'bad action')
      return reply.code(400).send({ error: 'Некорректное действие' })
    }
    try {
      await applyAction(db, req.user!.id, parsed.data)
    } catch (e) {
      if (e instanceof ActionError) return reply.code(e.statusCode).send({ error: e.message })
      throw e
    }
    return trainerState(db, req.user!.id)
  })
}
