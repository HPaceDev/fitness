import type { WorkoutStatus } from '../data/types'

export const STATUS_LABEL: Record<WorkoutStatus, string> = {
  planned: 'Запланирована',
  done: 'Проведена',
  cancelled: 'Отменена',
  missed: 'Пропуск',
}

const STATUS_CLASS: Record<WorkoutStatus, string> = {
  planned: 'pill--accent',
  done: 'pill--green',
  cancelled: 'pill--gray',
  missed: 'pill--red',
}

export function StatusPill({ status }: { status: WorkoutStatus }) {
  return <span className={`pill ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
}

export function SessionsPill({ remaining }: { remaining: number }) {
  if (remaining < 0) return <span className="pill pill--red">Долг {-remaining}</span>
  if (remaining === 0) return <span className="pill pill--red">0 занятий</span>
  if (remaining <= 2) return <span className="pill pill--yellow">Осталось {remaining}</span>
  return <span className="pill pill--green">Осталось {remaining}</span>
}
