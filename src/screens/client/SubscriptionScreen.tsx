import { useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useStore } from '../../data/store'
import { clientByUser, clientStats, groupById } from '../../data/selectors'
import { PoolCard } from '../../components/PoolCard'
import { Sheet } from '../../components/Sheet'
import { formatDateShort, parseLocal, sessionsWord, toLocalInput } from '../../utils/date'
import { formatMoney } from '../../utils/money'
import { uid } from '../../utils/id'
import { NoClientCard } from './NoClientCard'

export function SubscriptionScreen() {
  const { user } = useAuth()
  const { state, dispatch } = useStore()
  const client = user ? clientByUser(state, user.id) : undefined
  const stats = useMemo(() => (client ? clientStats(state, client) : null), [state, client])
  const [reporting, setReporting] = useState<string | null>(null) // key кошелька

  const payments = useMemo(
    () => (client ? state.payments.filter((p) => p.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date)) : []),
    [state.payments, client],
  )

  if (!client || !stats) return <NoClientCard />

  return (
    <div className="app__content">
      <header className="header">
        <div>
          <h1 className="header__title">Абонемент</h1>
          <p className="header__sub">Оплачено всего {formatMoney(stats.paidTotal)}</p>
        </div>
      </header>

      {stats.pools.map((p) => (
        <PoolCard key={p.key} pool={p} onPay={() => setReporting(p.key)} payLabel="Сообщить об оплате" />
      ))}

      <section className="section">
        <div className="section__title">История оплат</div>
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
                  {p.status === 'pending' ? <span className="pill pill--yellow">Ждёт тренера</span> : <span className="pill pill--green">Подтверждена</span>}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <ReportPaymentSheet
        key={reporting ?? 'closed'}
        open={reporting !== null}
        onClose={() => setReporting(null)}
        clientId={client.id}
        poolKey={reporting ?? 'personal'}
        onSubmit={(payment) => dispatch({ type: 'payment/add', payment })}
      />
    </div>
  )
}

const PACKS = [1, 4, 8, 10, 12]

function ReportPaymentSheet({
  open,
  onClose,
  clientId,
  poolKey,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  clientId: string
  poolKey: string
  onSubmit: (p: import('../../data/types').Payment) => void
}) {
  const { state } = useStore()
  const client = state.clients.find((c) => c.id === clientId)!
  const group = poolKey !== 'personal' ? groupById(state, poolKey) : undefined
  const price = group ? group.pricePerSession : client.pricePerSession
  const [sessions, setSessions] = useState(8)
  const [amount, setAmount] = useState(String(price * 8))
  const [touched, setTouched] = useState(false)
  const [date, setDate] = useState(() => toLocalInput(new Date()).slice(0, 10))
  const [comment, setComment] = useState('')

  const pick = (n: number) => {
    setSessions(n)
    if (!touched) setAmount(String(price * n))
  }

  const submit = () => {
    onSubmit({
      id: uid('p'),
      clientId,
      groupId: group?.id,
      sessions,
      amount: Number(amount) || 0,
      date,
      comment: comment.trim() || undefined,
      status: 'pending',
    })
    onClose()
  }

  return (
    <Sheet open={open} title={`Сообщить об оплате · ${group ? group.name : 'персональные'}`} onClose={onClose}>
      <div className="form">
        <div className="field">
          <span className="field__label">Пакет</span>
          <div className="chips">
            {PACKS.map((n) => (
              <button key={n} className={`chip${sessions === n ? ' chip--active' : ''}`} onClick={() => pick(n)}>
                {n} {sessionsWord(n)}
              </button>
            ))}
          </div>
        </div>
        <div className="field-row">
          <label className="field">
            <span className="field__label">Занятий</span>
            <input className="field__input" value={sessions} inputMode="numeric" onChange={(e) => pick(Number(e.target.value) || 0)} />
          </label>
          <label className="field">
            <span className="field__label">Перевёл, ₽</span>
            <input
              className="field__input"
              value={amount}
              inputMode="numeric"
              onChange={(e) => {
                setTouched(true)
                setAmount(e.target.value)
              }}
            />
          </label>
        </div>
        <span className="field__hint">Цена занятия {formatMoney(price)}. Занятия появятся на абонементе после подтверждения тренером.</span>
        <label className="field">
          <span className="field__label">Дата перевода</span>
          <input className="field__input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Комментарий</span>
          <input className="field__input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Перевод на карту" />
        </label>
        <button className="btn" disabled={sessions <= 0} onClick={submit}>
          Отправить тренеру
        </button>
      </div>
    </Sheet>
  )
}
