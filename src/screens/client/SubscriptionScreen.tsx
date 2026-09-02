import { useMemo } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useStore } from '../../data/store'
import { clientByUser, clientStats, consumesFor, exerciseProgress, groupById, involvesClient, measurementStatus } from '../../data/selectors'
import { MeasurementsSummary } from '../../components/MeasurementsTable'
import { ProgressList } from '../../components/ProgressList'
import { PoolCard } from '../../components/PoolCard'
import { WorkoutCard } from '../../components/WorkoutCard'
import { formatDateShort, formatDayLong, parseLocal, sessionsWord } from '../../utils/date'
import { formatMoney } from '../../utils/money'
import { NoClientCard } from './NoClientCard'

export function SubscriptionScreen() {
  const { user } = useAuth()
  const { state } = useStore()
  const client = user ? clientByUser(state, user.id) : undefined
  const stats = useMemo(() => (client ? clientStats(state, client) : null), [state, client])

  const payments = useMemo(
    () => (client ? state.payments.filter((p) => p.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date)) : []),
    [state.payments, client],
  )
  /** Проведённые занятия подопечного: что списано с абонемента */
  const attended = useMemo(
    () =>
      client
        ? state.workouts
            .filter((w) => involvesClient(state, w, client.id) && consumesFor(w, client.id))
            .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
        : [],
    [state, client],
  )

  const progress = useMemo(() => (client ? exerciseProgress(state, client.id) : []), [state, client])
  const measures = useMemo(() => (client ? measurementStatus(state, client) : null), [state, client])

  if (!client || !stats) return <NoClientCard />

  const usedTotal = stats.pools.reduce((s, p) => s + p.used, 0)

  return (
    <div className="app__content">
      <header className="header">
        <div>
          <h1 className="header__title">Мои тренировки</h1>
          <p className="header__sub">
            Оплачено {formatMoney(stats.paidTotal)} · отходил {usedTotal} {sessionsWord(usedTotal)}
          </p>
        </div>
      </header>

      {stats.pools.map((p) => (
        <PoolCard key={p.key} pool={p} />
      ))}

      <div className="card small mt12" style={{ background: 'var(--yellow-soft)', color: 'var(--yellow-text)' }}>
        Оплата переводом тренеру на карту. После перевода тренер отмечает оплату, и занятия появятся здесь.
      </div>

      <section className="section">
        <div className="section__title">
          <span>Оплаты</span>
          <small>{formatMoney(stats.paidTotal)}</small>
        </div>
        <div className="list">
          {payments.length === 0 && <div className="empty">Оплат ещё не было</div>}
          {payments.map((p) => {
            const g = groupById(state, p.groupId)
            return (
              <div key={p.id} className="row">
                <div className="row__body">
                  <div className="row__title">
                    {p.sessions} {sessionsWord(p.sessions)} · {g ? g.name : 'персональные'}
                  </div>
                  <div className="row__sub">
                    {formatDateShort(parseLocal(p.date))}
                    {p.comment ? ` · ${p.comment}` : ''}
                  </div>
                </div>
                <div className="row__right">
                  <div className="bold num">{formatMoney(p.amount)}</div>
                  <span className="pill pill--green">Оплачено</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="section">
        <div className="section__title">
          <span>Мой прогресс</span>
          <small>{progress.length ? `${progress.length} упр.` : ''}</small>
        </div>
        <ProgressList items={progress} />
      </section>

      {measures?.last && (
        <section className="section">
          <div className="section__title">
            <span>Мои замеры</span>
            <small>{measures.history.length} {measures.history.length === 1 ? 'замер' : measures.history.length < 5 ? 'замера' : 'замеров'}</small>
          </div>
          <MeasurementsSummary status={measures} />
        </section>
      )}

      <section className="section">
        <div className="section__title">
          <span>Отходил</span>
          <small>{attended.length} {sessionsWord(attended.length)}</small>
        </div>
        {attended.length === 0 && <div className="card empty">Проведённых занятий пока нет</div>}
        {attended.map((w) => (
          <div key={w.id} style={{ marginBottom: 8 }}>
            <div className="small muted" style={{ margin: '0 4px 4px' }}>
              {formatDayLong(parseLocal(w.startsAt))}
            </div>
            <WorkoutCard workout={w} viewerClientId={client.id} />
          </div>
        ))}
      </section>
    </div>
  )
}
