import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { Sheet } from '../components/Sheet'
import { toLocalInput, sessionsWord } from '../utils/date'
import { formatMoney } from '../utils/money'

/* ---------------- Добавить подопечного ---------------- */

export function AddClientSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch } = useStore()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [price, setPrice] = useState('3000')
  const [note, setNote] = useState('')

  const valid = name.trim().length > 1 && Number(price) > 0

  const submit = () => {
    if (!valid) return
    dispatch({
      type: 'client/add',
      client: { name: name.trim(), phone: phone.trim() || undefined, pricePerSession: Number(price), note: note.trim() || undefined },
    })
    setName('')
    setPhone('')
    setNote('')
    onClose()
  }

  return (
    <Sheet open={open} title="Новый подопечный" onClose={onClose}>
      <div className="form">
        <label className="field">
          <span className="field__label">Имя</span>
          <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Анна Смирнова" autoFocus />
        </label>
        <label className="field">
          <span className="field__label">Телефон</span>
          <input className="field__input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 ..." inputMode="tel" />
        </label>
        <label className="field">
          <span className="field__label">Цена занятия, ₽</span>
          <input className="field__input" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
        </label>
        <label className="field">
          <span className="field__label">Заметка</span>
          <textarea className="field__input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Травмы, цели, пожелания" />
        </label>
        <button className="btn" disabled={!valid} onClick={submit}>
          Добавить
        </button>
      </div>
    </Sheet>
  )
}

/* ---------------- Добавить оплату ---------------- */

const PACKS = [1, 4, 8, 10, 12]

export function AddPaymentSheet({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const { state, dispatch } = useStore()
  const client = state.clients.find((c) => c.id === clientId)
  const [sessions, setSessions] = useState('8')
  const [amount, setAmount] = useState(() => String((client?.pricePerSession ?? 0) * 8))
  const [amountTouched, setAmountTouched] = useState(false)
  const [date, setDate] = useState(() => toLocalInput(new Date()).slice(0, 10))
  const [comment, setComment] = useState('')

  const pickSessions = (n: number) => {
    setSessions(String(n))
    if (!amountTouched && client) setAmount(String(client.pricePerSession * n))
  }

  const valid = Number(sessions) > 0 && Number(amount) >= 0 && !!client
  const perSession = Number(sessions) > 0 ? Math.round(Number(amount) / Number(sessions)) : 0

  const submit = () => {
    if (!valid) return
    dispatch({
      type: 'payment/add',
      payment: { clientId, sessions: Number(sessions), amount: Number(amount), date, comment: comment.trim() || undefined },
    })
    onClose()
  }

  if (!client) return null
  return (
    <Sheet open={open} title="Оплата" onClose={onClose}>
      <div className="form">
        <div className="field">
          <span className="field__label">Абонемент</span>
          <div className="chips">
            {PACKS.map((n) => (
              <button key={n} className={`chip${Number(sessions) === n ? ' chip--active' : ''}`} onClick={() => pickSessions(n)}>
                {n} {sessionsWord(n)}
              </button>
            ))}
          </div>
        </div>
        <div className="field-row">
          <label className="field">
            <span className="field__label">Занятий</span>
            <input className="field__input" value={sessions} inputMode="numeric" onChange={(e) => pickSessions(Number(e.target.value) || 0)} />
          </label>
          <label className="field">
            <span className="field__label">Сумма, ₽</span>
            <input
              className="field__input"
              value={amount}
              inputMode="numeric"
              onChange={(e) => {
                setAmountTouched(true)
                setAmount(e.target.value)
              }}
            />
          </label>
        </div>
        <span className="field__hint">
          {perSession > 0 ? `${formatMoney(perSession)} за занятие` : ' '} · обычная цена {formatMoney(client.pricePerSession)}
        </span>
        <label className="field">
          <span className="field__label">Дата оплаты</span>
          <input className="field__input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Комментарий</span>
          <input className="field__input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Перевод на карту" />
        </label>
        <button className="btn" disabled={!valid} onClick={submit}>
          Записать {formatMoney(Number(amount) || 0)}
        </button>
      </div>
    </Sheet>
  )
}

/* ---------------- Добавить тренировку ---------------- */

const DURATIONS = [45, 60, 90]

export function AddWorkoutSheet({
  open,
  onClose,
  clientId,
  defaultDate,
}: {
  open: boolean
  onClose: () => void
  clientId?: string
  defaultDate?: Date
}) {
  const { state, dispatch } = useStore()
  const clients = useMemo(() => [...state.clients].sort((a, b) => a.name.localeCompare(b.name, 'ru')), [state.clients])
  const [client, setClient] = useState(clientId ?? clients[0]?.id ?? '')
  const [startsAt, setStartsAt] = useState(() => {
    const d = defaultDate ? new Date(defaultDate) : new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return toLocalInput(d)
  })
  const [duration, setDuration] = useState(60)
  const [repeatWeeks, setRepeatWeeks] = useState(0)

  const valid = !!client && !!startsAt

  const submit = () => {
    if (!valid) return
    const base = new Date(startsAt)
    for (let i = 0; i <= repeatWeeks; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() + i * 7)
      dispatch({ type: 'workout/add', workout: { clientId: client, startsAt: d.toISOString(), durationMin: duration, status: 'planned' } })
    }
    onClose()
  }

  return (
    <Sheet open={open} title="Новая тренировка" onClose={onClose}>
      <div className="form">
        {!clientId && (
          <label className="field">
            <span className="field__label">Подопечный</span>
            <select className="field__input" value={client} onChange={(e) => setClient(e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span className="field__label">Дата и время</span>
          <input className="field__input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </label>
        <div className="field">
          <span className="field__label">Длительность</span>
          <div className="seg">
            {DURATIONS.map((d) => (
              <button key={d} className={`seg__item${duration === d ? ' seg__item--active' : ''}`} onClick={() => setDuration(d)}>
                {d} мин
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field__label">Повторять еженедельно</span>
          <div className="seg">
            {[0, 3, 7].map((n) => (
              <button key={n} className={`seg__item${repeatWeeks === n ? ' seg__item--active' : ''}`} onClick={() => setRepeatWeeks(n)}>
                {n === 0 ? 'Нет' : `${n + 1} нед.`}
              </button>
            ))}
          </div>
        </div>
        <button className="btn" disabled={!valid} onClick={submit}>
          Добавить {repeatWeeks > 0 ? `(${repeatWeeks + 1} шт.)` : ''}
        </button>
      </div>
    </Sheet>
  )
}
