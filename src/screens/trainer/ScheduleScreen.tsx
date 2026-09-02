import { useMemo, useState } from 'react'
import { useStore } from '../../data/store'
import { clientById, clientStats, upcomingBirthdays, workoutsByDay } from '../../data/selectors'
import { Link } from 'react-router-dom'
import { formatPhone } from '../../utils/phone'
import type { Workout } from '../../data/types'
import { addDays, formatDayLong, isSameDay, plural, startOfDay, toDateKey, weekdayShort } from '../../utils/date'
import { SessionsPill } from '../../components/StatusPill'
import { WorkoutCard } from '../../components/WorkoutCard'
import { AddWorkoutSheet } from './forms'
import { WorkoutSheet } from './WorkoutSheet'
import { PaymentAlerts } from '../../components/PaymentAlerts'
import { MeasureDue } from '../../components/MeasureDue'

const DAYS_BACK = 7
const DAYS_FWD = 21

export function ScheduleScreen() {
  const { state } = useStore()
  const today = useMemo(() => startOfDay(new Date()), [])
  const [selected, setSelected] = useState<Date>(today)
  const [adding, setAdding] = useState(false)
  const [openWorkout, setOpenWorkout] = useState<Workout | null>(null)

  const days = useMemo(() => Array.from({ length: DAYS_BACK + DAYS_FWD + 1 }, (_, i) => addDays(today, i - DAYS_BACK)), [today])
  const byDay = useMemo(() => workoutsByDay(state, days[0]!, days[days.length - 1]!), [state, days])

  const dayWorkouts = byDay.get(toDateKey(selected)) ?? []
  const birthdays = useMemo(() => upcomingBirthdays(state, 7), [state])
  const todayCount = (byDay.get(toDateKey(today)) ?? []).filter((w) => w.status !== 'cancelled').length

  const upcoming = useMemo(() => {
    const out: { date: Date; items: Workout[] }[] = []
    for (let i = 1; i <= 7; i++) {
      const d = addDays(selected, i)
      const items = byDay.get(toDateKey(d))
      if (items && items.length) out.push({ date: d, items })
    }
    return out
  }, [selected, byDay])

  const extraFor = (w: Workout) => {
    if (!w.clientId) return null
    const c = clientById(state, w.clientId)
    if (!c) return null
    const remaining = clientStats(state, c).personal.remaining
    if (w.status === 'planned' && remaining === 1) return <span className="pill pill--yellow">последнее оплаченное</span>
    if (w.status === 'planned' && remaining <= 0) return <span className="pill pill--red">не оплачено</span>
    return <SessionsPill remaining={remaining} />
  }

  return (
    <div className="app__content">
      <header className="header">
        <div>
          <h1 className="header__title">Расписание</h1>
          <p className="header__sub">
            {isSameDay(selected, today)
              ? todayCount > 0
                ? `Сегодня ${todayCount} ${plural(todayCount, 'тренировка', 'тренировки', 'тренировок')}`
                : 'Сегодня тренировок нет'
              : formatDayLong(selected)}
          </p>
        </div>
        <div className="header__actions">
          {!isSameDay(selected, today) && (
            <button className="icon-btn" title="Сегодня" onClick={() => setSelected(today)}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{today.getDate()}</span>
            </button>
          )}
          <button className="icon-btn icon-btn--primary" onClick={() => setAdding(true)} aria-label="Добавить тренировку">
            +
          </button>
        </div>
      </header>

      <PaymentAlerts />
      <MeasureDue />

      {birthdays.map((b) => (
        <Link key={b.client.id} to={`/clients/${b.client.id}`} className="bday">
          <span className="bday__icon">🎂</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="bday__title">
              {b.client.name}: {b.inDays === 0 ? 'сегодня день рождения' : b.inDays === 1 ? 'завтра день рождения' : `день рождения через ${b.inDays} ${plural(b.inDays, 'день', 'дня', 'дней')}`}
            </div>
            <div className="bday__sub">
              {b.age ? `Исполняется ${b.age}` : 'Не забудьте поздравить'}
              {b.client.phone ? ` · ${formatPhone(b.client.phone)}` : ''}
            </div>
          </div>
          <span className="row__chevron">›</span>
        </Link>
      ))}

      <div className="daystrip">
        {days.map((d) => {
          const key = toDateKey(d)
          const has = (byDay.get(key) ?? []).some((w) => w.status !== 'cancelled')
          const cls = ['day', isSameDay(d, today) && 'day--today', isSameDay(d, selected) && 'day--active'].filter(Boolean).join(' ')
          return (
            <button key={key} className={cls} onClick={() => setSelected(d)} ref={isSameDay(d, selected) ? scrollIntoViewOnce : undefined}>
              <span className="day__wd">{weekdayShort(d)}</span>
              <span className="day__num">{d.getDate()}</span>
              <span className="day__dot" style={{ opacity: has ? 1 : 0 }} />
            </button>
          )
        })}
      </div>

      <section className="section" style={{ marginTop: 4 }}>
        <div className="section__title">
          <span>{formatDayLong(selected)}</span>
          <small>{dayWorkouts.length ? `${dayWorkouts.length} шт.` : ''}</small>
        </div>
        {dayWorkouts.length === 0 ? (
          <div className="card empty">
            Тренировок нет.
            <br />
            <button className="btn btn--ghost btn--sm mt8" onClick={() => setAdding(true)}>
              Добавить на этот день
            </button>
          </div>
        ) : (
          dayWorkouts.map((w) => <WorkoutCard key={w.id} workout={w} onClick={() => setOpenWorkout(w)} extra={extraFor(w)} />)
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="section">
          <div className="section__title">Дальше</div>
          {upcoming.map(({ date, items }) => (
            <div key={toDateKey(date)} style={{ marginBottom: 12 }}>
              <div className="small muted bold" style={{ margin: '0 4px 6px' }}>
                {formatDayLong(date)}
              </div>
              {items.map((w) => (
                <WorkoutCard key={w.id} workout={w} onClick={() => setOpenWorkout(w)} />
              ))}
            </div>
          ))}
        </section>
      )}

      <AddWorkoutSheet key={`add-${adding}-${toDateKey(selected)}`} open={adding} onClose={() => setAdding(false)} defaultDate={selected} />
      <WorkoutSheet workout={openWorkout} onClose={() => setOpenWorkout(null)} />
    </div>
  )
}

function scrollIntoViewOnce(el: HTMLButtonElement | null) {
  el?.scrollIntoView({ inline: 'center', block: 'nearest' })
}
