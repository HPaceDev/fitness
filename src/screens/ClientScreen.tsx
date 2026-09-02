import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../data/store'
import { clientById, clientStats } from '../data/selectors'
import { Avatar } from '../components/Avatar'
import { StatusPill } from '../components/StatusPill'
import { Sheet } from '../components/Sheet'
import { formatDateShort, formatDayLong, formatTime, parseLocal, sessionsWord } from '../utils/date'
import { formatMoney } from '../utils/money'
import { AddPaymentSheet, AddWorkoutSheet } from './forms'

export function ClientScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const client = clientById(state, id)
  const [paying, setPaying] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<'workouts' | 'payments'>('workouts')

  const stats = useMemo(() => (client ? clientStats(state, client) : null), [state, client])
  const workouts = useMemo(
    () => state.workouts.filter((w) => w.clientId === id).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [state.workouts, id],
  )
  const payments = useMemo(
    () => state.payments.filter((p) => p.clientId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [state.payments, id],
  )

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

  const total = stats.purchasedSessions || 1
  const progress = Math.max(0, Math.min(100, (stats.remainingSessions / total) * 100))

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
            {client.phone ?? 'Без телефона'} · {formatMoney(client.pricePerSession)}/занятие
          </div>
        </div>
        <button className="icon-btn icon-btn--ghost" onClick={() => setEditing(true)} aria-label="Редактировать">
          ✎
        </button>
      </div>
      {client.note && (
        <div className="card small" style={{ background: 'var(--yellow-soft)', boxShadow: 'none', marginBottom: 10 }}>
          {client.note}
        </div>
      )}

      <div className={`stat${stats.remainingSessions <= 0 ? '' : ' stat--accent'}`} style={stats.remainingSessions <= 0 ? { background: 'var(--red)', color: '#fff' } : undefined}>
        <div className="stat__label" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Осталось занятий
        </div>
        <div className="stat__value num" style={{ fontSize: 40 }}>
          {stats.remainingSessions}
          <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 8, opacity: 0.85 }}>из {stats.purchasedSessions}</span>
        </div>
        <div className="stat__hint" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {stats.remainingSessions < 0
            ? `Долг ${-stats.remainingSessions} ${sessionsWord(-stats.remainingSessions)} = ${formatMoney(stats.debt)}`
            : stats.plannedSessions > stats.remainingSessions
              ? `Запланировано ${stats.plannedSessions}, хватит на ${stats.remainingSessions}`
              : `Запланировано ${stats.plannedSessions}`}
        </div>
        <div className="progress" style={{ background: 'rgba(255,255,255,0.3)' }}>
          <div className="progress__fill" style={{ width: `${progress}%`, background: '#fff' }} />
        </div>
      </div>

      <div className="stats mt12">
        <div className="stat">
          <div className="stat__label">Оплачено всего</div>
          <div className="stat__value num" style={{ fontSize: 20 }}>{formatMoney(stats.paidTotal)}</div>
          <div className="stat__hint">{stats.lastPaymentDate ? `Последняя ${formatDateShort(parseLocal(stats.lastPaymentDate))}` : 'Оплат не было'}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Проведено</div>
          <div className="stat__value num" style={{ fontSize: 20 }}>{stats.usedSessions}</div>
          <div className="stat__hint">{stats.nextWorkout ? `След. ${formatDayLong(parseLocal(stats.nextWorkout.startsAt))}` : 'Нет ближайших'}</div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn" onClick={() => setPaying(true)}>
          + Оплата
        </button>
        <button className="btn btn--secondary" onClick={() => setAdding(true)}>
          + Тренировка
        </button>
      </div>

      <section className="section">
        <div className="seg" style={{ marginBottom: 10 }}>
          <button className={`seg__item${tab === 'workouts' ? ' seg__item--active' : ''}`} onClick={() => setTab('workouts')}>
            Тренировки · {workouts.length}
          </button>
          <button className={`seg__item${tab === 'payments' ? ' seg__item--active' : ''}`} onClick={() => setTab('payments')}>
            Оплаты · {payments.length}
          </button>
        </div>

        {tab === 'workouts' && (
          <div className="list">
            {workouts.length === 0 && <div className="empty">Тренировок ещё нет</div>}
            {workouts.map((w) => {
              const d = parseLocal(w.startsAt)
              return (
                <div key={w.id} className="row">
                  <div className="row__body">
                    <div className="row__title num">
                      {formatDayLong(d)}, {formatTime(d)}
                    </div>
                    <div className="row__sub">{w.durationMin} мин</div>
                  </div>
                  <StatusPill status={w.status} />
                </div>
              )
            })}
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
                  <div className="small muted num">{formatMoney(Math.round(p.amount / p.sessions))}/зан.</div>
                </div>
                <button className="icon-btn icon-btn--ghost" style={{ color: 'var(--text-3)', width: 28 }} onClick={() => dispatch({ type: 'payment/remove', id: p.id })} aria-label="Удалить оплату">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <AddPaymentSheet key={`pay-${paying}`} open={paying} onClose={() => setPaying(false)} clientId={client.id} />
      <AddWorkoutSheet key={`w-${adding}`} open={adding} onClose={() => setAdding(false)} clientId={client.id} />
      <EditClientSheet open={editing} onClose={() => setEditing(false)} clientId={client.id} />
    </div>
  )
}

function EditClientSheet({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const client = clientById(state, clientId)!
  const [name, setName] = useState(client.name)
  const [phone, setPhone] = useState(client.phone ?? '')
  const [price, setPrice] = useState(String(client.pricePerSession))
  const [note, setNote] = useState(client.note ?? '')

  const save = () => {
    dispatch({
      type: 'client/update',
      id: clientId,
      patch: { name: name.trim(), phone: phone.trim() || undefined, pricePerSession: Number(price) || client.pricePerSession, note: note.trim() || undefined },
    })
    onClose()
  }

  const remove = () => {
    if (!confirm(`Удалить ${client.name} вместе с оплатами и тренировками?`)) return
    dispatch({ type: 'client/remove', id: clientId })
    navigate('/clients')
  }

  return (
    <Sheet open={open} title="Подопечный" onClose={onClose}>
      <div className="form">
        <label className="field">
          <span className="field__label">Имя</span>
          <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Телефон</span>
          <input className="field__input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </label>
        <label className="field">
          <span className="field__label">Цена занятия, ₽</span>
          <input className="field__input" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
        </label>
        <label className="field">
          <span className="field__label">Заметка</span>
          <textarea className="field__input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className="btn" onClick={save}>
          Сохранить
        </button>
        <button className="btn btn--danger" onClick={remove}>
          Удалить подопечного
        </button>
      </div>
    </Sheet>
  )
}
