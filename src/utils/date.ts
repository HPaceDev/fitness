const pad = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM-DD в локальном времени */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** YYYY-MM-DDTHH:mm в локальном времени (для input[type=datetime-local]) */
export function toLocalInput(d: Date): string {
  return `${toDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function parseLocal(iso: string): Date {
  return new Date(iso)
}

export function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b)
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]
const MONTHS_NOM = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export function weekdayShort(d: Date): string {
  return WEEKDAYS_SHORT[d.getDay()]
}

export function formatDayLong(d: Date): string {
  const today = new Date()
  if (isSameDay(d, today)) return 'Сегодня'
  if (isSameDay(d, addDays(today, 1))) return 'Завтра'
  if (isSameDay(d, addDays(today, -1))) return 'Вчера'
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}, ${weekdayShort(d)}`
}

export function formatDateShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}

export function formatMonth(d: Date): string {
  return `${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`
}

/** Правильное склонение: 1 занятие, 2 занятия, 5 занятий */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return many
  if (last > 1 && last < 5) return few
  if (last === 1) return one
  return many
}

export const sessionsWord = (n: number) => plural(n, 'занятие', 'занятия', 'занятий')
