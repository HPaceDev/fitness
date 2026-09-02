import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useStore } from '../../data/store'
import { clientById, groupById, monthFinance } from '../../data/selectors'
import { Avatar } from '../../components/Avatar'
import { formatDateShort, formatMonth, isSameMonth, parseLocal, plural, sessionsWord } from '../../utils/date'
import { formatMoney } from '../../utils/money'
import { TelegramCard } from '../../components/TelegramCard'

export function FinanceScreen() {
  const { state } = useStore()
  const { logout } = useAuth()
  const [month, setMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const fin = useMemo(() => monthFinance(state, month), [state, month])
  const payments = useMemo(
    () => state.payments.filter((p) => isSameMonth(parseLocal(p.date), month)).sort((a, b) => b.date.localeCompare(a.date)),
    [state.payments, month],
  )

  const shift = (n: number) => {
    const d = new Date(month)
    d.setMonth(d.getMonth() + n)
    setMonth(d)
  }
  const isCurrent = isSameMonth(month, new Date())

  return (
    <div className="app__content">
      <header className="header">
        <div>
          <h1 className="header__title">Финансы</h1>
          <p className="header__sub">{formatMonth(month)}</p>
        </div>
        <div className="header__actions">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Предыдущий месяц">
            ‹
          </button>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Следующий месяц" disabled={isCurrent} style={isCurrent ? { opacity: 0.35 } : undefined}>
            ›
          </button>
        </div>
      </header>

      <div className="stats">
        <div className="stat stat--accent stat--wide">
          <div className="stat__label">Получено оплат</div>
          <div className="stat__value num" style={{ fontSize: 32 }}>{formatMoney(fin.received)}</div>
          <div className="stat__hint">
            {fin.paymentsCount} {plural(fin.paymentsCount, 'оплата', 'оплаты', 'оплат')} за месяц
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Отработано</div>
          <div className="stat__value num" style={{ fontSize: 20 }}>{formatMoney(fin.earned)}</div>
          <div className="stat__hint">
            {fin.doneSessions} {plural(fin.doneSessions, 'тренировка', 'тренировки', 'тренировок')}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Запланировано</div>
          <div className="stat__value num" style={{ fontSize: 20 }}>{formatMoney(fin.expected)}</div>
          <div className="stat__hint">ещё в этом месяце</div>
        </div>
        <div className="stat stat--wide">
          <div className="stat__label">Подопечные</div>
          <div className="stat__value num" style={{ fontSize: 20 }}>
            {state.clients.filter((c) => c.status !== 'paused').length} активных
            {state.clients.some((c) => c.status === 'paused') && (
              <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}> · {state.clients.filter((c) => c.status === 'paused').length} на паузе</span>
            )}
          </div>
          <div className="stat__hint">на паузе не считаются в плане, история сохраняется</div>
        </div>
        {fin.debtTotal > 0 && (
          <div className="stat stat--wide" style={{ background: 'var(--red-soft)' }}>
            <div className="stat__label" style={{ color: 'var(--red)' }}>
              Занимаются в долг
            </div>
            <div className="stat__value num" style={{ fontSize: 20, color: 'var(--red)' }}>{formatMoney(fin.debtTotal)}</div>
            <div className="stat__hint">{fin.debtors.map((d) => d.client.name.split(' ')[0]).join(', ')}</div>
          </div>
        )}
      </div>

      <section className="section">
        <div className="section__title">
          <span>Оплаты</span>
          <small>{payments.length ? formatMoney(fin.received) : ''}</small>
        </div>
        <div className="list">
          {payments.length === 0 && <div className="empty">В этом месяце оплат не было</div>}
          {payments.map((p) => {
            const c = clientById(state, p.clientId)
            return (
              <div key={p.id} className="row">
                {c ? (
                  <Link to={`/clients/${c.id}`}>
                    <Avatar name={c.name} id={c.id} />
                  </Link>
                ) : (
                  <span className="avatar" style={{ background: 'var(--text-3)' }}>
                    ?
                  </span>
                )}
                <div className="row__body">
                  <div className="row__title">{c?.name ?? 'Удалённый подопечный'}</div>
                  <div className="row__sub">
                    {formatDateShort(parseLocal(p.date))} · {p.sessions} {sessionsWord(p.sessions)} · {groupById(state, p.groupId)?.name ?? 'персональные'}
                    {p.comment ? ` · ${p.comment}` : ''}
                  </div>
                </div>
                <div className="row__right bold num">{formatMoney(p.amount)}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Аккаунт</div>
        <TelegramCard role="trainer" />
        <div className="card small muted" style={{ marginTop: 10 }}>
          {state.trainer ? `${state.trainer.name} · ${state.trainer.phone}` : ''}
          <div className="btn-row">
            <button className="btn btn--secondary btn--sm" onClick={logout}>
              Выйти
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
