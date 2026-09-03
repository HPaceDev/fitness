import { useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useStore } from '../../data/store'
import { clientByUser, clientStats, involvesClient, workoutsByDay } from '../../data/selectors'
import type { Workout } from '../../data/types'
import { addDays, formatDayLong, formatTime, isSameDay, parseLocal, startOfDay, toDateKey, weekdayShort } from '../../utils/date'
import { WorkoutCard } from '../../components/WorkoutCard'
import { Blank } from '../../components/Blank'
import { CalendarBlank } from '../../components/icons'
import { NoClientCard } from './NoClientCard'

const DAYS_BACK = 7
const DAYS_FWD = 21

export function HomeScreen() {
  const { user } = useAuth()
  const { state } = useStore()
  const client = user ? clientByUser(state, user.id) : undefined
  const today = useMemo(() => startOfDay(new Date()), [])
  const [selected, setSelected] = useState<Date>(today)

  const days = useMemo(() => Array.from({ length: DAYS_BACK + DAYS_FWD + 1 }, (_, i) => addDays(today, i - DAYS_BACK)), [today])
  const byDay = useMemo(
    () => (client ? workoutsByDay(state, days[0]!, days[days.length - 1]!, (w) => involvesClient(state, w, client.id)) : new Map<string, Workout[]>()),
    [state, days, client],
  )
  const stats = client ? clientStats(state, client) : null

  if (!client || !stats) return <NoClientCard />

  const dayWorkouts = byDay.get(toDateKey(selected)) ?? []
  const next = stats.nextWorkout
  const firstName = client.name.split(' ')[0]

  const upcoming: { date: Date; items: Workout[] }[] = []
  for (let i = 1; i <= 14; i++) {
    const d = addDays(selected, i)
    const items = byDay.get(toDateKey(d))
    if (items && items.length) upcoming.push({ date: d, items })
  }

  return (
    <div className="app__content">
      <header className="header">
        <div>
          <h1 className="header__title">Привет, {firstName}</h1>
          <p className="header__sub">
            {next ? `Следующая: ${formatDayLong(parseLocal(next.startsAt))} в ${formatTime(parseLocal(next.startsAt))}` : 'Ближайших тренировок нет'}
          </p>
        </div>
      </header>

      <div className={`hero${stats.remainingTotal <= 0 ? ' hero--alert' : ''}`}>
        <div className="hero__label">Осталось занятий</div>
        <div className="hero__rows">
          <div className="hero__row">
            <span className="hero__row-label">Персональные и групповые</span>
            <span className="hero__row-value num">
              {stats.pool.remaining}
              <span className="hero__row-of"> / {stats.pool.purchased}</span>
            </span>
          </div>
        </div>
        <div className="hero__sub">{stats.debtTotal > 0 ? 'Есть занятия в долг, загляните в «Мои тренировки»' : 'Подробности в разделе «Мои тренировки»'}</div>
      </div>

      <div className="daystrip" style={{ marginTop: 14 }}>
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
        <div className="section__title">{formatDayLong(selected)}</div>
        {dayWorkouts.length === 0 ? (
          <Blank icon={<CalendarBlank size={22} />} title="В этот день тренировок нет" text="Расписание ведёт тренер. Новая тренировка появится здесь сразу после того, как он её поставит." />
        ) : (
          dayWorkouts.map((w) => <WorkoutCard key={w.id} workout={w} viewerClientId={client.id} next={w.id === stats.nextWorkout?.id} />)
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
                <WorkoutCard key={w.id} workout={w} viewerClientId={client.id} next={w.id === stats.nextWorkout?.id} />
              ))}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function scrollIntoViewOnce(el: HTMLButtonElement | null) {
  el?.scrollIntoView({ inline: 'center', block: 'nearest' })
}
