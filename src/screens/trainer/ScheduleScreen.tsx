import { useMemo, useState } from 'react'
import { useStore } from '../../data/store'
import { clientById, clientStats, workoutsByDay } from '../../data/selectors'
import type { Workout } from '../../data/types'
import { addDays, formatDayLong, isSameDay, parseLocal, plural, startOfDay, toDateKey, weekdayShort } from '../../utils/date'
import { SessionsPill } from '../../components/StatusPill'
import { WorkoutCard } from '../../components/WorkoutCard'
import { AddWorkoutSheet } from './forms'
import { WorkoutSheet } from './WorkoutSheet'
import { AttentionStrip } from '../../components/AttentionStrip'
import { CalendarBlank, Plus } from '../../components/icons'
import { Blank } from '../../components/Blank'

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
  // Ближайшая запланированная тренировка во всём расписании
  const nextId = useMemo(() => {
    const now = new Date()
    return [...state.workouts]
      .filter((w) => w.status === 'planned' && parseLocal(w.startsAt) >= now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]?.id
  }, [state.workouts])
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
            <Plus size={22} weight="bold" />
          </button>
        </div>
      </header>

      <AttentionStrip />

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
          <Blank
            icon={<CalendarBlank size={22} />}
            title="В этот день тренировок нет"
            text="Поставьте тренировку подопечному или группе, она появится здесь и у него в приложении."
            action={
              <button className="btn btn--sm mt8" onClick={() => setAdding(true)}>
                <Plus size={16} weight="bold" /> Добавить тренировку
              </button>
            }
          />
        ) : (
          dayWorkouts.map((w) => <WorkoutCard key={w.id} workout={w} onClick={() => setOpenWorkout(w)} extra={extraFor(w)} next={w.id === nextId} />)
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
                <WorkoutCard key={w.id} workout={w} onClick={() => setOpenWorkout(w)} next={w.id === nextId} />
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
