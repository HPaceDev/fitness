import type { ReactNode } from 'react'
import { useStore } from '../data/store'
import { clientById, groupById } from '../data/selectors'
import type { Workout } from '../data/types'
import { KIND_LABEL } from '../data/types'
import { formatTime, parseLocal } from '../utils/date'
import { StatusPill, AttendancePill } from './StatusPill'

interface Props {
  workout: Workout
  onClick?: () => void
  /** Ближайшая тренировка: заливается акцентом */
  next?: boolean
  /** Что показать под названием (например, пилюлю остатка) */
  extra?: ReactNode
  /** Если карточку смотрит подопечный — показываем его отметку, а не общий статус */
  viewerClientId?: string
}

export function workoutTitle(state: ReturnType<typeof useStore>['state'], w: Workout): string {
  if (w.clientId) return clientById(state, w.clientId)?.name ?? 'Удалённый подопечный'
  if (w.groupId) return groupById(state, w.groupId)?.name ?? 'Удалённая группа'
  return 'Тренировка'
}

export function WorkoutCard({ workout, onClick, extra, viewerClientId, next }: Props) {
  const { state } = useStore()
  const start = parseLocal(workout.startsAt)
  const end = new Date(start.getTime() + workout.durationMin * 60_000)
  const group = workout.groupId ? groupById(state, workout.groupId) : undefined

  const cls = ['workout', `workout--${workout.status}`, group && 'workout--group', next && 'workout--next'].filter(Boolean).join(' ')

  let right: ReactNode
  if (viewerClientId && group && workout.status === 'done') right = <AttendancePill value={workout.attendance?.[viewerClientId]} />
  else if (workout.status !== 'planned') right = <StatusPill status={workout.status} />
  else if (onClick) right = <span className="row__chevron">›</span>

  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={cls} onClick={onClick}>
      <div className="workout__time">
        <span className="workout__start num">{formatTime(start)}</span>
        <span className="workout__end num">{formatTime(end)}</span>
      </div>
      <div className="workout__bar" />
      <div className="workout__body">
        {next && <span className="workout__flag">Ближайшая</span>}
        <span className="workout__name">{workoutTitle(state, workout)}</span>
        <span className="workout__meta">
          <span>
            {[
              `${workout.durationMin} мин`,
              // Название группы уже говорит, что это группа: не повторяемся
              group ? `${group.memberIds.length} чел.` : null,
              workout.kind && workout.kind !== 'other' ? KIND_LABEL[workout.kind].toLowerCase() : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          {extra}
        </span>
      </div>
      <div className="workout__status">{right}</div>
    </Tag>
  )
}
