import type { Attendance, WorkoutStatus } from '../data/types'

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

export const ATTENDANCE_LABEL: Record<Attendance, string> = {
  present: 'Был',
  missed: 'Пропуск',
  excused: 'Не считать',
}

export function StatusPill({ status }: { status: WorkoutStatus }) {
  return <span className={`pill ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
}

export function AttendancePill({ value }: { value?: Attendance }) {
  if (!value) return <span className="pill pill--gray">Не отмечен</span>
  const cls = value === 'present' ? 'pill--green' : value === 'missed' ? 'pill--red' : 'pill--gray'
  return <span className={`pill ${cls}`}>{ATTENDANCE_LABEL[value]}</span>
}

export function SessionsPill({ remaining, label }: { remaining: number; label?: string }) {
  const prefix = label ? `${label}: ` : ''
  if (remaining < 0) return <span className="pill pill--red">{prefix}долг {-remaining}</span>
  if (remaining === 0) return <span className="pill pill--red">{prefix}0</span>
  if (remaining <= 2) return <span className="pill pill--yellow">{prefix}{remaining}</span>
  return <span className="pill pill--green">{prefix}{remaining}</span>
}
