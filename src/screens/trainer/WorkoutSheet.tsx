import { Link } from 'react-router-dom'
import { useStore } from '../../data/store'
import { clientById, clientStats, groupById } from '../../data/selectors'
import type { Attendance, Workout, WorkoutStatus } from '../../data/types'
import { Avatar } from '../../components/Avatar'
import { Sheet } from '../../components/Sheet'
import { StatusPill, SessionsPill, ATTENDANCE_LABEL } from '../../components/StatusPill'
import { formatDayLong, formatTime, parseLocal, toDateKey } from '../../utils/date'
import { ExerciseSheet } from '../../components/ExerciseSheet'
import { Barbell, Check } from '../../components/icons'
import { useState } from 'react'

const ATT: Attendance[] = ['present', 'missed', 'excused']

/** Карточка тренировки для тренера: статус, участники, удаление */
export function WorkoutSheet({ workout, onClose }: { workout: Workout | null; onClose: () => void }) {
  const { state, dispatch } = useStore()
  const [logging, setLogging] = useState(false)
  if (!workout) return null
  // Берём свежую версию из состояния, чтобы отметки обновлялись
  const w = state.workouts.find((x) => x.id === workout.id) ?? workout
  const start = parseLocal(w.startsAt)
  const client = clientById(state, w.clientId)
  const group = groupById(state, w.groupId)
  const stats = client ? clientStats(state, client) : null

  const setStatus = (status: WorkoutStatus) => dispatch({ type: 'workout/setStatus', id: w.id, status })
  const remove = () => {
    dispatch({ type: 'workout/remove', id: w.id })
    onClose()
  }

  return (
    <Sheet open title={group ? 'Групповая тренировка' : 'Тренировка'} onClose={onClose}>
      {client && (
        <Link to={`/clients/${client.id}`} className="row row--clickable" style={{ padding: '4px 0 14px' }}>
          <Avatar name={client.name} id={client.id} />
          <div className="row__body">
            <div className="row__title">{client.name}</div>
            <div className="row__sub">{stats && <SessionsPill remaining={stats.pool.remaining} label="Осталось" />}</div>
          </div>
          <span className="row__chevron">›</span>
        </Link>
      )}
      {group && (
        <Link to={`/groups/${group.id}`} className="row row--clickable" style={{ padding: '4px 0 14px' }}>
          <span className="group-mark">{group.name.slice(0, 2).toUpperCase()}</span>
          <div className="row__body">
            <div className="row__title">{group.name}</div>
            <div className="row__sub">{group.memberIds.length} чел.</div>
          </div>
          <span className="row__chevron">›</span>
        </Link>
      )}

      <div className="card">
        <div className="flex between">
          <span className="muted">Когда</span>
          <span className="bold num">
            {formatDayLong(start)}, {formatTime(start)}
          </span>
        </div>
        <div className="flex between mt8">
          <span className="muted">Длительность</span>
          <span className="bold">{w.durationMin} мин</span>
        </div>
        <div className="flex between mt8">
          <span className="muted">Статус</span>
          <StatusPill status={w.status} />
        </div>
      </div>

      {group && w.status === 'done' && (
        <section className="section" style={{ marginTop: 14 }}>
          <div className="section__title">Кто был</div>
          <div className="list">
            {group.memberIds.map((cid) => {
              const c = clientById(state, cid)
              const cur = w.attendance?.[cid]
              return (
                <div key={cid} className="row row--stack">
                  <div className="row__title">{c?.name ?? 'Без имени'}</div>
                  <div className="att">
                    {ATT.map((a) => (
                      <button
                        key={a}
                        className={`att__btn${cur === a ? ` att__btn--${a}` : ''}`}
                        onClick={() => dispatch({ type: 'workout/setAttendance', id: w.id, clientId: cid, value: a })}
                      >
                        {ATTENDANCE_LABEL[a]}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="field__hint mt8">«Был» и «Пропуск» списывают занятие с абонемента. «Не считать» не списывает.</p>
        </section>
      )}

      {client && (w.status === 'done' || w.status === 'planned') && (
        <div className="btn-row">
          <button className="btn btn--secondary" onClick={() => setLogging(true)}>
            <Barbell size={18} /> Записать прогресс
          </button>
        </div>
      )}
      {client && (
        <ExerciseSheet key={`ex-${logging}`} open={logging} onClose={() => setLogging(false)} clientId={client.id} workoutId={w.id} defaultDate={toDateKey(start)} />
      )}

      {w.status === 'planned' ? (
        <>
          <div className="btn-row">
            <button className="btn" onClick={() => setStatus('done')}>
              <Check size={18} weight="bold" /> Проведена
            </button>
          </div>
          <div className="btn-row">
            {!group && (
              <button className="btn btn--secondary" onClick={() => setStatus('missed')}>
                Пропуск
              </button>
            )}
            <button className="btn btn--secondary" onClick={() => setStatus('cancelled')}>
              Отменить
            </button>
          </div>
          {!group && <p className="field__hint mt12">Пропуск списывает занятие с абонемента. Отмена не списывает.</p>}
        </>
      ) : (
        <div className="btn-row">
          <button className="btn btn--secondary" onClick={() => setStatus('planned')}>
            Вернуть в запланированные
          </button>
        </div>
      )}
      <div className="btn-row">
        <button className="btn btn--danger" onClick={remove}>
          Удалить тренировку
        </button>
      </div>
    </Sheet>
  )
}
