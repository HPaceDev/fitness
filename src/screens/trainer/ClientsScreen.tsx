import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../data/store'
import { allClientStats } from '../../data/selectors'
import { Avatar } from '../../components/Avatar'
import { SessionsPill } from '../../components/StatusPill'
import { formatMoney } from '../../utils/money'
import { formatDayLong, formatTime, parseLocal } from '../../utils/date'
import { ClientSheet, GroupSheet } from './forms'

export function ClientsScreen() {
  const { state } = useStore()
  const [addingClient, setAddingClient] = useState(false)
  const [addingGroup, setAddingGroup] = useState(false)

  const stats = useMemo(() => {
    const all = allClientStats(state)
    return [...all.filter((s) => s.client.status !== 'paused'), ...all.filter((s) => s.client.status === 'paused')]
  }, [state])
  const lowCount = stats.filter((s) => s.hasLow).length

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
                <div className="pills">
                  {s.client.status === 'paused' && <span className="pill pill--gray">На паузе</span>}
                  <SessionsPill remaining={s.pool.remaining} label="Осталось" />
                </div>
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
