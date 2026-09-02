import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../data/store'
import { allClientStats } from '../../data/selectors'
import { Avatar } from '../../components/Avatar'
import { SessionsPill } from '../../components/StatusPill'
import { formatDayLong, formatTime, parseLocal } from '../../utils/date'
import { formatMoney } from '../../utils/money'
import { ClientSheet, GroupSheet } from './forms'

export function ClientsScreen() {
  const { state } = useStore()
  const [addingClient, setAddingClient] = useState(false)
  const [addingGroup, setAddingGroup] = useState(false)

  const stats = useMemo(() => allClientStats(state), [state])
  const lowCount = stats.filter((s) => s.hasLow).length
  const pendingCount = state.payments.filter((p) => p.status === 'pending').length

  return (
    <div className="app__content">
      <header className="header">
        <div>
          <h1 className="header__title">Подопечные</h1>
          <p className="header__sub">
            {stats.length} чел. · {state.groups.length} {state.groups.length === 1 ? 'группа' : state.groups.length < 5 ? 'группы' : 'групп'}
            {lowCount > 0 && ` · ${lowCount} без занятий`}
          </p>
        </div>
        <button className="icon-btn icon-btn--primary" onClick={() => setAddingClient(true)} aria-label="Добавить подопечного">
          +
        </button>
      </header>

      {pendingCount > 0 && (
        <Link to="/finance" className="card flex between" style={{ background: 'var(--yellow-soft)', boxShadow: 'none', marginBottom: 14 }}>
          <span className="small bold">Ожидают подтверждения: {pendingCount} {pendingCount === 1 ? 'оплата' : 'оплаты'}</span>
          <span className="row__chevron">›</span>
        </Link>
      )}

      <section className="section" style={{ marginTop: 0 }}>
        <div className="section__title">
          <span>Группы</span>
          <button className="btn btn--ghost btn--sm" style={{ minHeight: 24, padding: 0 }} onClick={() => setAddingGroup(true)}>
            + Группа
          </button>
        </div>
        <div className="list">
          {state.groups.length === 0 && <div className="empty">Групп пока нет. Создайте первую — цена занятия в группе одна для всех.</div>}
          {state.groups.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="row row--clickable">
              <span className="group-mark">{g.name.slice(0, 2).toUpperCase()}</span>
              <div className="row__body">
                <div className="row__title">{g.name}</div>
                <div className="row__sub">
                  {g.memberIds.length} чел. · {formatMoney(g.pricePerSession)} за занятие
                </div>
              </div>
              <span className="row__chevron">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Все подопечные</div>
        <div className="list">
          {stats.length === 0 && <div className="empty">Никого нет</div>}
          {stats.map((s) => (
            <Link key={s.client.id} to={`/clients/${s.client.id}`} className="row row--clickable">
              <Avatar name={s.client.name} id={s.client.id} />
              <div className="row__body">
                <div className="row__title">{s.client.name}</div>
                <div className="row__sub">
                  {s.nextWorkout
                    ? `След.: ${formatDayLong(parseLocal(s.nextWorkout.startsAt))}, ${formatTime(parseLocal(s.nextWorkout.startsAt))}`
                    : 'Тренировки не запланированы'}
                </div>
              </div>
              <div className="row__right" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                {s.pools.map((p) => (
                  <SessionsPill key={p.key} remaining={p.remaining} label={p.groupId ? p.label.split(' ')[0] : 'Перс.'} />
                ))}
              </div>
              <span className="row__chevron">›</span>
            </Link>
          ))}
        </div>
      </section>

      <ClientSheet key={`c-${addingClient}`} open={addingClient} onClose={() => setAddingClient(false)} />
      <GroupSheet key={`g-${addingGroup}`} open={addingGroup} onClose={() => setAddingGroup(false)} />
    </div>
  )
}
