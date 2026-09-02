import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store'
import { clientById, clientStats, workoutsByDay } from '../data/selectors'
import type { Workout, WorkoutStatus } from '../data/types'
import { addDays, formatDayLong, formatTime, isSameDay, parseLocal, plural, startOfDay, toDateKey, weekdayShort } from '../utils/date'
import { Avatar } from '../components/Avatar'
import { StatusPill, STATUS_LABEL } from '../components/StatusPill'
import { Sheet } from '../components/Sheet'
import { AddWorkoutSheet } from './forms'
import { SessionsPill } from '../components/StatusPill'

const DAYS_BACK = 7
const DAYS_FWD = 21

export function ScheduleScreen() {
  const { state, dispatch } = useStore()
  const today = useMemo(() => startOfDay(new Date()), [])
  const [selected, setSelected] = useState<Date>(today)
  const [adding, setAdding] = useState(false)
  const [openWorkout, setOpenWorkout] = useState<Workout | null>(null)

  const days = useMemo(() => Array.from({ length: DAYS_BACK + DAYS_FWD + 1 }, (_, i) => addDays(today, i - DAYS_BACK)), [today])
  const byDay = useMemo(() => workoutsByDay(state, days[0]!, days[days.length - 1]!), [state, days])

  const dayWorkouts = byDay.get(toDateKey(selected)) ?? []
  const todayCount = (byDay.get(toDateKey(today)) ?? []).filter((w) => w.status !== 'cancelled').length

  // Ближайшие дни после выбранного, чтобы на экране было видно «что дальше»
  const upcoming = useMemo(() => {
    const out: { date: Date; items: Workout[] }[] = []
    for (let i = 1; i <= 7; i++) {
      const d = addDays(selected, i)
      const items = byDay.get(toDateKey(d))
      if (items && items.length) out.push({ date: d, items })
    }
    return out
  }, [selected, byDay])

  const setStatus = (id: string, status: WorkoutStatus) => {
    dispatch({ type: 'workout/setStatus', id, status })
    setOpenWorkout(null)
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
          dayWorkouts.map((w) => <WorkoutCard key={w.id} workout={w} onClick={() => setOpenWorkout(w)} />)
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
                <WorkoutCard key={w.id} workout={w} onClick={() => setOpenWorkout(w)} compact />
              ))}
            </div>
          ))}
        </section>
      )}

      <AddWorkoutSheet open={adding} onClose={() => setAdding(false)} defaultDate={selected} />

      <Sheet open={!!openWorkout} title="Тренировка" onClose={() => setOpenWorkout(null)}>
        {openWorkout && <WorkoutDetails workout={openWorkout} onStatus={setStatus} onDelete={() => { dispatch({ type: 'workout/remove', id: openWorkout.id }); setOpenWorkout(null) }} />}
      </Sheet>
    </div>
  )
}

function scrollIntoViewOnce(el: HTMLButtonElement | null) {
  el?.scrollIntoView({ inline: 'center', block: 'nearest' })
}

function WorkoutCard({ workout, onClick, compact }: { workout: Workout; onClick: () => void; compact?: boolean }) {
  const { state } = useStore()
  const client = clientById(state, workout.clientId)
  const start = parseLocal(workout.startsAt)
  const end = new Date(start.getTime() + workout.durationMin * 60_000)
  const stats = client ? clientStats(state, client) : null

  return (
    <button className={`workout workout--${workout.status}`} onClick={onClick}>
      <div className="workout__time">
        <span className="workout__start num">{formatTime(start)}</span>
        <span className="workout__end num">{formatTime(end)}</span>
      </div>
      <div className="workout__bar" />
      <div className="workout__body">
        <span className="workout__name">{client?.name ?? 'Удалённый клиент'}</span>
        <span className="workout__meta">
          <span>{workout.durationMin} мин</span>
          {!compact && stats && <SessionsPill remaining={stats.remainingSessions} />}
        </span>
      </div>
      <div className="workout__status">{workout.status !== 'planned' ? <StatusPill status={workout.status} /> : <span className="row__chevron">›</span>}</div>
    </button>
  )
}

function WorkoutDetails({ workout, onStatus, onDelete }: { workout: Workout; onStatus: (id: string, s: WorkoutStatus) => void; onDelete: () => void }) {
  const { state } = useStore()
  const client = clientById(state, workout.clientId)
  const stats = client ? clientStats(state, client) : null
  const start = parseLocal(workout.startsAt)

  return (
    <div>
      {client && (
        <Link to={`/clients/${client.id}`} className="row row--clickable" style={{ padding: '8px 0 14px' }}>
          <Avatar name={client.name} id={client.id} />
          <div className="row__body">
            <div className="row__title">{client.name}</div>
            <div className="row__sub">{stats && <SessionsPill remaining={stats.remainingSessions} />}</div>
          </div>
          <span className="row__chevron">›</span>
        </Link>
      )}
      <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
        <div className="flex between">
          <span className="muted">Когда</span>
          <span className="bold num">
            {formatDayLong(start)}, {formatTime(start)}
          </span>
        </div>
        <div className="flex between mt8">
          <span className="muted">Длительность</span>
          <span className="bold">{workout.durationMin} мин</span>
        </div>
        <div className="flex between mt8">
          <span className="muted">Статус</span>
          <StatusPill status={workout.status} />
        </div>
      </div>

      {workout.status === 'planned' ? (
        <>
          <div className="btn-row">
            <button className="btn" onClick={() => onStatus(workout.id, 'done')}>
              ✓ Проведена
            </button>
          </div>
          <div className="btn-row">
            <button className="btn btn--secondary" onClick={() => onStatus(workout.id, 'missed')}>
              Пропуск
            </button>
            <button className="btn btn--secondary" onClick={() => onStatus(workout.id, 'cancelled')}>
              Отменить
            </button>
          </div>
          <p className="field__hint mt12">Пропуск списывает занятие с абонемента, отмена — нет.</p>
        </>
      ) : (
        <div className="btn-row">
          <button className="btn btn--secondary" onClick={() => onStatus(workout.id, 'planned')}>
            Вернуть в «{STATUS_LABEL.planned.toLowerCase()}»
          </button>
        </div>
      )}
      <div className="btn-row">
        <button className="btn btn--danger" onClick={onDelete}>
          Удалить тренировку
        </button>
      </div>
    </div>
  )
}
