import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store'
import { allClientStats } from '../data/selectors'
import { Avatar } from '../components/Avatar'
import { SessionsPill } from '../components/StatusPill'
import { formatDayLong, formatTime, parseLocal } from '../utils/date'
import { formatMoney } from '../utils/money'
import { AddClientSheet } from './forms'

type Filter = 'all' | 'low' | 'debt'

export function ClientsScreen() {
  const { state } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [adding, setAdding] = useState(false)

  const stats = useMemo(() => allClientStats(state), [state])
  const lowCount = stats.filter((s) => s.remainingSessions <= 2 && s.remainingSessions >= 0).length
  const debtCount = stats.filter((s) => s.remainingSessions < 0).length

  const visible = stats.filter((s) => {
    if (filter === 'low') return s.remainingSessions <= 2 && s.remainingSessions >= 0
    if (filter === 'debt') return s.remainingSessions < 0
    return true
  })

  return (
    <div className="app__content">
      <header className="header">
        <div>
          <h1 className="header__title">Подопечные</h1>
          <p className="header__sub">
            {stats.length} чел.
            {lowCount > 0 && ` · ${lowCount} заканчивается абонемент`}
            {debtCount > 0 && ` · ${debtCount} в долг`}
          </p>
        </div>
        <button className="icon-btn icon-btn--primary" onClick={() => setAdding(true)} aria-label="Добавить подопечного">
          +
        </button>
      </header>

      <div className="seg" style={{ marginBottom: 14 }}>
        {(
          [
            ['all', 'Все'],
            ['low', `Мало${lowCount ? ` · ${lowCount}` : ''}`],
            ['debt', `Долг${debtCount ? ` · ${debtCount}` : ''}`],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button key={key} className={`seg__item${filter === key ? ' seg__item--active' : ''}`} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="list">
        {visible.length === 0 && <div className="empty">Никого нет</div>}
        {visible.map((s) => (
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
            <div className="row__right">
              <SessionsPill remaining={s.remainingSessions} />
              {s.debt > 0 && <div className="small" style={{ color: 'var(--red)', marginTop: 4 }}>{formatMoney(s.debt)}</div>}
            </div>
            <span className="row__chevron">›</span>
          </Link>
        ))}
      </div>

      <AddClientSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
