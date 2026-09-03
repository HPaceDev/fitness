import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarBlank, Check, Ruler, TrendUp, Wallet } from '../../components/icons'
import { Ring } from '../../components/Ring'

const KEY = 'fittrainer.onboarded'

export const isOnboarded = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}
export const markOnboarded = () => {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* приватный режим */
  }
}

/**
 * Знакомство с приложением. Показывается один раз до входа.
 * Вместо выдуманных картинок здесь настоящие элементы интерфейса
 * с примерными данными: человек сразу видит, как выглядит продукт.
 */
const SLIDES = [
  {
    Icon: CalendarBlank,
    title: 'Расписание, которое ведёт тренер',
    text: 'Тренер ставит тренировки, отмечает проведённые. Подопечный просто открывает и смотрит.',
    preview: <SchedulePreview />,
  },
  {
    Icon: Wallet,
    title: 'Абонемент виден обоим',
    text: 'Занятия общие: персональные и групповые из одного счёта. Никто больше не спрашивает, сколько осталось.',
    preview: <BalancePreview />,
  },
  {
    Icon: TrendUp,
    title: 'Прогресс и замеры под рукой',
    text: 'Веса по упражнениям и замеры тела. Приложение само подскажет прошлый результат и напомнит про новые замеры.',
    preview: <ProgressPreview />,
  },
]

export function WelcomeScreen() {
  const navigate = useNavigate()
  const [i, setI] = useState(0)
  const touchX = useRef<number | null>(null)
  const slide = SLIDES[i]!
  const last = i === SLIDES.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, SLIDES.length - 1))
      if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const finish = () => {
    markOnboarded()
    navigate('/login', { replace: true })
  }
  const next = () => (last ? finish() : setI(i + 1))

  return (
    <div
      className="welcome"
      onTouchStart={(e) => (touchX.current = e.touches[0]!.clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0]!.clientX - touchX.current
        if (dx < -40) setI((v) => Math.min(v + 1, SLIDES.length - 1))
        if (dx > 40) setI((v) => Math.max(v - 1, 0))
        touchX.current = null
      }}
    >
      <header className="welcome__top">
        <span className="welcome__logo">
          Fit<em>Trainer</em>
        </span>
        <button className="welcome__skip" onClick={finish}>
          Пропустить
        </button>
      </header>

      <div className="welcome__stage" key={i}>
        <div className="welcome__art">{slide.preview}</div>
      </div>

      <div className="welcome__copy" key={`c${i}`}>
        <span className="welcome__badge">
          <slide.Icon size={18} weight="bold" />
        </span>
        <h1 className="welcome__title">{slide.title}</h1>
        <p className="welcome__text">{slide.text}</p>
      </div>

      <div className="welcome__foot">
        <div className="welcome__dots" role="tablist" aria-label="Слайды">
          {SLIDES.map((s, n) => (
            <button
              key={s.title}
              className={`welcome__dot${n === i ? ' welcome__dot--on' : ''}`}
              onClick={() => setI(n)}
              role="tab"
              aria-selected={n === i}
              aria-label={s.title}
            />
          ))}
        </div>
        <button className="btn" onClick={next}>
          {last ? 'Начать' : 'Далее'}
          <ArrowRight size={18} weight="bold" />
        </button>
      </div>
    </div>
  )
}

/* ---------- Превью: настоящие элементы интерфейса ---------- */

function SchedulePreview() {
  const days = [
    { wd: 'пн', n: 8 },
    { wd: 'вт', n: 9, dot: true },
    { wd: 'ср', n: 10, active: true, dot: true },
    { wd: 'чт', n: 11 },
    { wd: 'пт', n: 12, dot: true },
  ]
  return (
    <div className="prev">
      <div className="prev__days">
        {days.map((d) => (
          <div key={d.n} className={`day${d.active ? ' day--active' : ''}`}>
            <span className="day__wd">{d.wd}</span>
            <span className="day__num">{d.n}</span>
            <span className="day__dot" style={{ opacity: d.dot ? 1 : 0 }} />
          </div>
        ))}
      </div>
      <div className="workout workout--planned" style={{ marginTop: 10 }}>
        <div className="workout__time">
          <span className="workout__start num">09:00</span>
          <span className="workout__end num">10:00</span>
        </div>
        <div className="workout__bar" />
        <div className="workout__body">
          <span className="workout__name">Анна Смирнова</span>
          <span className="workout__meta">60 мин · персональная · силовая</span>
        </div>
      </div>
      <div className="workout workout--done workout--group">
        <div className="workout__time">
          <span className="workout__start num">18:30</span>
          <span className="workout__end num">19:30</span>
        </div>
        <div className="workout__bar" />
        <div className="workout__body">
          <span className="workout__name">Вечерняя сила</span>
          <span className="workout__meta">60 мин · группа, 4 чел.</span>
        </div>
        <div className="workout__status">
          <span className="pill pill--green">Проведена</span>
        </div>
      </div>
    </div>
  )
}

function BalancePreview() {
  return (
    <div className="prev">
      <div className="pool">
        <div className="pool__main">
          <div className="pool__head">
            <div>
              <div className="pool__label">Абонемент</div>
              <div className="pool__price">общий на персональные и групповые</div>
            </div>
          </div>
          <div className="pool__big">
            <span className="pool__num num">7</span>
            <span className="pool__of">из 12 занятий</span>
          </div>
          <div className="small muted mt8">Отходил 5 · запланировано 3</div>
        </div>
        <Ring value={7 / 12} label="7" />
      </div>
      <div className="card" style={{ borderColor: "rgba(255,200,87,0.35)", marginTop: 10 }}>
        <div className="flex between" style={{ gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div className="bold">Игорь: последнее оплаченное занятие</div>
            <div className="small muted">Абонемент · пятница, 18:00</div>
          </div>
          <span className="btn btn--sm">Напомнить</span>
        </div>
      </div>
    </div>
  )
}

function ProgressPreview() {
  return (
    <div className="prev">
      <div className="list">
        <div className="row">
          <div className="row__body">
            <div className="row__title">Присед со штангой</div>
            <div className="row__sub">вчера · 6 записей</div>
          </div>
          <div className="row__right">
            <div className="bold num">45 кг × 8</div>
            <span className="pill pill--green">+2,5 кг</span>
          </div>
        </div>
        <div className="row">
          <div className="row__body">
            <div className="row__title">Румынская тяга</div>
            <div className="row__sub">3 дня назад · 4 записи</div>
          </div>
          <div className="row__right">
            <div className="bold num">40 кг × 10</div>
            <span className="pill pill--green">+5 кг</span>
          </div>
        </div>
      </div>
      <div className="card flex" style={{ gap: 10, marginTop: 10 }}>
        <Ruler size={20} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bold small">Талия 69 см</div>
          <div className="small muted">с начала занятий минус 3 см</div>
        </div>
        <span className="pill pill--green">
          <Check size={12} weight="bold" /> замеры
        </span>
      </div>
    </div>
  )
}
