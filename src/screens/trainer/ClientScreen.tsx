import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../../data/store'
import { clientById, clientStats, exerciseProgress, groupsOfClient, involvesClient, measurementStatus } from '../../data/selectors'
import { MeasurementSheet } from '../../components/MeasurementSheet'
import { MeasurementsHistory, MeasurementsSummary } from '../../components/MeasurementsTable'
import { PencilSimple, Plus } from '../../components/icons'
import { ExerciseSheet } from '../../components/ExerciseSheet'
import { ProgressList } from '../../components/ProgressList'
import type { Workout } from '../../data/types'
import { Avatar } from '../../components/Avatar'
import { PoolCard } from '../../components/PoolCard'
import { WorkoutCard } from '../../components/WorkoutCard'
import { formatDateShort, formatDayLong, parseLocal, sessionsWord } from '../../utils/date'
import { formatMoney } from '../../utils/money'
import { formatPhone } from '../../utils/phone'
import { AddPaymentSheet, AddWorkoutSheet, ClientSheet } from './forms'
import { InviteSheet } from './InviteSheet'
import { WorkoutSheet } from './WorkoutSheet'

export function ClientScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const client = clientById(state, id)
  const [paying, setPaying] = useState<string | null>(null) // groupId или '' для персональных
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [openWorkout, setOpenWorkout] = useState<Workout | null>(null)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'workouts' | 'payments' | 'progress' | 'measurements'>(params.get('tab') === 'measurements' ? 'measurements' : 'progress')
  const [measuring, setMeasuring] = useState(false)
  const [logging, setLogging] = useState(false)
  const [inviting, setInviting] = useState(false)

  const stats = useMemo(() => (client ? clientStats(state, client) : null), [state, client])
  const workouts = useMemo(
    () => (client ? state.workouts.filter((w) => involvesClient(state, w, client.id)).sort((a, b) => b.startsAt.localeCompare(a.startsAt)) : []),
    [state, client],
  )
  const payments = useMemo(() => state.payments.filter((p) => p.clientId === id).sort((a, b) => b.date.localeCompare(a.date)), [state.payments, id])
  const groups = client ? groupsOfClient(state, client.id) : []
  const progress = useMemo(() => (client ? exerciseProgress(state, client.id) : []), [state, client])
  const measures = useMemo(() => (client ? measurementStatus(state, client) : null), [state, client])

  if (!client || !stats) {
    return (
      <div className="app__content">
        <button className="back" onClick={() => navigate('/clients')}>
          ‹ Подопечные
        </button>
        <div className="empty">Подопечный не найден</div>
      </div>
    )
  }

  return (
    <div className="app__content">
      <button className="back" onClick={() => navigate(-1)}>
        ‹ Назад
      </button>

      <div className="profile">
        <Avatar name={client.name} id={client.id} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile__name">{client.name}</div>
          <div className="profile__sub">
            {client.phone ? formatPhone(client.phone) : 'Без телефона'}
            {client.birthday ? ` · ДР ${formatDateShort(parseLocal(client.birthday))}` : ''}
            {client.userId ? ' · в приложении' : ''}
            {client.status === 'paused' ? ' · на паузе' : ''}
          </div>
        </div>
        <button className="icon-btn icon-btn--ghost" onClick={() => setEditing(true)} aria-label="Редактировать">
          <PencilSimple size={20} />
        </button>
      </div>
      {client.note && (
        <div className="card small" style={{ background: 'var(--yellow-soft)', marginBottom: 10, color: 'var(--yellow-text)' }}>
          {client.note}
        </div>
      )}
      {!client.userId && (
        <button className="card flex between" style={{ width: '100%', textAlign: 'left', marginBottom: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }} onClick={() => setInviting(true)}>
          <span className="small bold">Пригласить в приложение по ссылке</span>
          <span className="row__chevron">›</span>
        </button>
      )}
      {groups.length > 0 && (
        <div className="chips" style={{ marginBottom: 12 }}>
          {groups.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="chip" style={{ whiteSpace: "normal" }}>
              {g.name}
            </Link>
          ))}
        </div>
      )}

      {stats.pools.map((p) => (
        <PoolCard key={p.key} pool={p} onPay={() => setPaying('')} />
      ))}

      <div className="stats mt12">
        <div className="stat">
          <div className="stat__label">Оплачено всего</div>
          <div className="stat__value num" style={{ fontSize: 20 }}>{formatMoney(stats.paidTotal)}</div>
          <div className="stat__hint">{stats.lastPaymentDate ? `Последняя ${formatDateShort(parseLocal(stats.lastPaymentDate))}` : 'Оплат не было'}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Проведено</div>
          <div className="stat__value num" style={{ fontSize: 20 }}>{stats.pools.reduce((s, p) => s + p.used, 0)}</div>
          <div className="stat__hint">{stats.nextWorkout ? `След. ${formatDayLong(parseLocal(stats.nextWorkout.startsAt))}` : 'Нет ближайших'}</div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn" onClick={() => setPaying('')}>
          + Оплата
        </button>
        <button className="btn btn--secondary" onClick={() => setAdding(true)}>
          + Тренировка
        </button>
      </div>

      <section className="section">
        <div className="seg" style={{ marginBottom: 10 }}>
          <button className={`seg__item${tab === 'progress' ? ' seg__item--active' : ''}`} onClick={() => setTab('progress')}>
            Прогресс
          </button>
          <button className={`seg__item${tab === 'measurements' ? ' seg__item--active' : ''}`} onClick={() => setTab('measurements')}>
            Замеры{measures?.due ? ' •' : ''}
          </button>
          <button className={`seg__item${tab === 'workouts' ? ' seg__item--active' : ''}`} onClick={() => setTab('workouts')}>
            Трен.
          </button>
          <button className={`seg__item${tab === 'payments' ? ' seg__item--active' : ''}`} onClick={() => setTab('payments')}>
            Оплаты
          </button>
        </div>

        {tab === 'measurements' && measures && (
          <div>
            {measures.due && (
              <div className="card small" style={{ background: 'var(--yellow-soft)', color: 'var(--yellow-text)', marginBottom: 10 }}>
                {measures.last ? `Прошло ${measures.daysSince} дн. с последних замеров, пора обновить.` : 'Начальных замеров ещё нет. Сделайте их, чтобы видеть результат.'}
              </div>
            )}
            <button className="btn" style={{ marginBottom: 10 }} onClick={() => setMeasuring(true)}>
              <Plus size={18} weight="bold" /> {measures.last ? 'Новые замеры' : 'Начальные замеры'}
            </button>
            <MeasurementsSummary status={measures} />
            {measures.history.length > 0 && (
              <>
                <div className="section__title" style={{ marginTop: 16 }}>История</div>
                <MeasurementsHistory history={measures.history} onRemove={(id) => dispatch({ type: 'measurement/remove', id })} />
              </>
            )}
            <p className="field__hint mt8">Напомним о замерах через {60} дней после последних.</p>
          </div>
        )}

        {tab === 'progress' && (
          <div>
            <button className="btn" style={{ marginBottom: 10 }} onClick={() => setLogging(true)}>
              <Plus size={18} weight="bold" /> Записать упражнение
            </button>
            <ProgressList items={progress} onRemove={(id) => dispatch({ type: 'exercise/remove', id })} />
            <p className="field__hint mt8">Напечатайте упражнение, приложение подскажет название из ваших записей и покажет прошлый вес.</p>
          </div>
        )}

        {tab === 'workouts' && (
          <div>
            {workouts.length === 0 && <div className="card empty">Тренировок ещё нет</div>}
            {workouts.map((w) => (
              <div key={w.id} style={{ marginBottom: 8 }}>
                <div className="small muted" style={{ margin: '0 4px 4px' }}>
                  {formatDayLong(parseLocal(w.startsAt))}
                </div>
                <WorkoutCard workout={w} onClick={() => setOpenWorkout(w)} viewerClientId={w.groupId ? client.id : undefined} />
              </div>
            ))}
          </div>
        )}

        {tab === 'payments' && (
          <div className="list">
            {payments.length === 0 && <div className="empty">Оплат ещё нет</div>}
            {payments.map((p) => (
              <div key={p.id} className="row">
                <div className="row__body">
                  <div className="row__title">
                    {p.sessions} {sessionsWord(p.sessions)}
                  </div>
                  <div className="row__sub">
                    {formatDateShort(parseLocal(p.date))}
                    {p.comment ? ` · ${p.comment}` : ''}
                  </div>
                </div>
                <div className="row__right">
                  <div className="bold num">{formatMoney(p.amount)}</div>
                  <div className="small muted num">{formatMoney(Math.round(p.amount / Math.max(p.sessions, 1)))}/зан.</div>
                </div>
                <button className="icon-btn icon-btn--ghost" style={{ color: 'var(--text-3)', width: 28 }} onClick={() => dispatch({ type: 'payment/remove', id: p.id })} aria-label="Удалить оплату">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <AddPaymentSheet key={`pay-${paying}`} open={paying !== null} onClose={() => setPaying(null)} clientId={client.id} />
      <AddWorkoutSheet key={`w-${adding}`} open={adding} onClose={() => setAdding(false)} clientId={client.id} />
      <ClientSheet key={`e-${editing}`} open={editing} onClose={() => setEditing(false)} clientId={client.id} onRemoved={() => navigate('/clients')} />
      <WorkoutSheet workout={openWorkout} onClose={() => setOpenWorkout(null)} />
      <ExerciseSheet key={`ex-${logging}`} open={logging} onClose={() => setLogging(false)} clientId={client.id} />
      <MeasurementSheet key={`m-${measuring}`} open={measuring} onClose={() => setMeasuring(false)} clientId={client.id} />
      <InviteSheet open={inviting} onClose={() => setInviting(false)} clientId={client.id} />
    </div>
  )
}
