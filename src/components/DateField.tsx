import { useEffect, useMemo, useRef, useState } from 'react'
import { CaretLeft, CaretRight, CalendarBlank, Clock } from './icons'
import { addDays, formatDateWithYear, formatDayLong, formatMonth, isSameDay, parseLocal, startOfDay, toDateKey } from '../utils/date'

/* ---------------- Календарь ---------------- */

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

/** Понедельник первым: 0 для понедельника, 6 для воскресенья */
const weekIndex = (d: Date) => (d.getDay() + 6) % 7

/** Дни, которые нужно нарисовать в сетке месяца, включая хвосты соседних месяцев */
function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = addDays(first, -weekIndex(first))
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i))
  // Шестая строка нужна не всегда: не показываем её, если она целиком из другого месяца
  const lastRow = cells.slice(35)
  return lastRow.every((d) => d.getMonth() !== month.getMonth()) ? cells.slice(0, 35) : cells
}

interface CalendarProps {
  value: string
  onPick: (key: string) => void
  /** Показывать список лет: нужен для дня рождения */
  years?: boolean
  /** Быстрые кнопки над сеткой */
  shortcuts?: boolean
}

function Calendar({ value, onPick, years, shortcuts }: CalendarProps) {
  const selected = value ? parseLocal(value) : null
  const today = startOfDay(new Date())
  const [month, setMonth] = useState(() => {
    const base = selected ?? today
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const [pickingYear, setPickingYear] = useState(false)
  const cells = useMemo(() => monthGrid(month), [month])
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  if (pickingYear) {
    // Для дня рождения будущие годы не нужны: показываем от текущего и вниз
    const list = Array.from({ length: 101 }, (_, i) => today.getFullYear() - i)
    return (
      <div className="cal">
        <div className="cal__head">
          <button type="button" className="cal__title" onClick={() => setPickingYear(false)}>
            Выберите год
          </button>
          <button type="button" className="cal__nav" onClick={() => setPickingYear(false)} aria-label="Назад к календарю">
            <CaretLeft size={16} weight="bold" />
          </button>
        </div>
        <div className="cal__years">
          {list.map((y) => (
            <button
              type="button"
              key={y}
              ref={y === month.getFullYear() ? (el) => el?.scrollIntoView({ block: 'center' }) : undefined}
              className={`cal__year${y === month.getFullYear() ? ' cal__year--on' : ''}`}
              onClick={() => {
                setMonth(new Date(y, month.getMonth(), 1))
                setPickingYear(false)
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const quick = [
    { label: 'Сегодня', key: toDateKey(today) },
    { label: 'Завтра', key: toDateKey(addDays(today, 1)) },
    { label: 'Через неделю', key: toDateKey(addDays(today, 7)) },
  ]

  return (
    <div className="cal">
      {shortcuts && (
        <div className="chips" style={{ marginBottom: 12 }}>
          {quick.map((q) => (
            <button type="button" key={q.key} className={`chip${value === q.key ? ' chip--active' : ''}`} onClick={() => onPick(q.key)}>
              {q.label}
            </button>
          ))}
        </div>
      )}
      <div className="cal__head">
        <button type="button" className={`cal__title${years ? ' cal__title--tap' : ''}`} onClick={() => years && setPickingYear(true)}>
          {formatMonth(month)}
          {years && <CaretRight size={13} weight="bold" />}
        </button>
        <div className="cal__navs">
          <button type="button" className="cal__nav" onClick={() => shift(-1)} aria-label="Предыдущий месяц">
            <CaretLeft size={16} weight="bold" />
          </button>
          <button type="button" className="cal__nav" onClick={() => shift(1)} aria-label="Следующий месяц">
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>
      <div className="cal__grid cal__grid--wd">
        {WEEKDAYS.map((w) => (
          <span key={w} className="cal__wd">
            {w}
          </span>
        ))}
      </div>
      <div className="cal__grid">
        {cells.map((d) => {
          const key = toDateKey(d)
          const cls = [
            'cal__day',
            d.getMonth() !== month.getMonth() && 'cal__day--out',
            selected && isSameDay(d, selected) && 'cal__day--on',
            isSameDay(d, today) && 'cal__day--today',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button type="button" key={key} className={cls} onClick={() => onPick(key)}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------- Поле с датой ---------------- */

interface DateFieldProps {
  label: string
  /** YYYY-MM-DD */
  value: string
  onChange: (v: string) => void
  hint?: string
  /** Быстрые кнопки над календарём */
  quick?: boolean
  years?: boolean
}

export function DateField({ label, value, onChange, hint, quick = true, years }: DateFieldProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <button type="button" className={`picker__btn${open ? ' picker__btn--open' : ''}`} onClick={() => setOpen(!open)}>
        <CalendarBlank size={18} />
        <span className="picker__value">{value ? (years ? formatDateWithYear(parseLocal(value)) : formatDayLong(parseLocal(value))) : 'Выберите дату'}</span>
        <CaretRight size={16} className={`picker__caret${open ? ' picker__caret--open' : ''}`} />
      </button>
      {open && (
        <div className="picker__panel">
          <Calendar
            value={value}
            years={years}
            shortcuts={quick}
            onPick={(k) => {
              onChange(k)
              setOpen(false)
            }}
          />
        </div>
      )}
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  )
}

/* ---------------- Поле с датой и временем ---------------- */

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const pad = (n: number) => String(n).padStart(2, '0')

interface DateTimeFieldProps {
  label: string
  /** YYYY-MM-DDTHH:mm */
  value: string
  onChange: (v: string) => void
}

export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  const [date, time] = value.split('T')
  const [hh, mm] = (time ?? '09:00').split(':').map(Number)
  const [openPart, setOpenPart] = useState<'date' | 'time' | null>(null)
  const hoursRef = useRef<HTMLDivElement>(null)

  // Выбранный час подкручиваем к началу, чтобы его было видно сразу
  useEffect(() => {
    if (openPart !== 'time') return
    const el = hoursRef.current?.querySelector('.tp__cell--on') as HTMLElement | null
    el?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [openPart])

  const setDate = (d: string) => onChange(`${d}T${pad(hh!)}:${pad(mm!)}`)
  const setTime = (h: number, m: number) => onChange(`${date}T${pad(h)}:${pad(m)}`)

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="picker__row">
        <button type="button" className={`picker__btn${openPart === 'date' ? ' picker__btn--open' : ''}`} onClick={() => setOpenPart(openPart === 'date' ? null : 'date')}>
          <CalendarBlank size={18} />
          <span className="picker__value">{date ? formatDayLong(parseLocal(date)) : 'Дата'}</span>
        </button>
        <button type="button" className={`picker__btn picker__btn--time${openPart === 'time' ? ' picker__btn--open' : ''}`} onClick={() => setOpenPart(openPart === 'time' ? null : 'time')}>
          <Clock size={18} />
          <span className="picker__value num">
            {pad(hh!)}:{pad(mm!)}
          </span>
        </button>
      </div>

      {openPart === 'date' && (
        <div className="picker__panel">
          <Calendar
            value={date ?? ''}
            shortcuts
            onPick={(k) => {
              setDate(k)
              setOpenPart('time')
            }}
          />
        </div>
      )}

      {openPart === 'time' && (
        <div className="picker__panel">
          <div className="tp__label">Час</div>
          <div className="tp__row" ref={hoursRef}>
            {HOURS.map((h) => (
              <button type="button" key={h} className={`tp__cell${h === hh ? ' tp__cell--on' : ''}`} onClick={() => setTime(h, mm!)}>
                {pad(h)}
              </button>
            ))}
          </div>
          <div className="tp__label">Минуты</div>
          <div className="tp__grid">
            {MINUTES.map((m) => (
              <button type="button" key={m} className={`tp__cell${m === mm ? ' tp__cell--on' : ''}`} onClick={() => setTime(hh!, m)}>
                {pad(m)}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--secondary mt12" onClick={() => setOpenPart(null)}>
            Готово
          </button>
        </div>
      )}
    </div>
  )
}
