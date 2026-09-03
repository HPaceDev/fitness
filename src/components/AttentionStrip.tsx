import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store'
import { measurementsDue, paymentAlerts, paymentReminderText, upcomingBirthdays, type PaymentAlert } from '../data/selectors'
import { api } from '../api/client'
import { Cake, Ruler, Wallet } from './icons'
import { formatTime, parseLocal } from '../utils/date'

/**
 * Лента дел на сегодня: оплаты, замеры, дни рождения.
 * Горизонтальная, чтобы не съедать высоту у самого расписания.
 */
export function AttentionStrip() {
  const { state } = useStore()
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, string>>({})

  const payments = paymentAlerts(state)
  const measures = measurementsDue(state)
  const birthdays = upcomingBirthdays(state, 7)
  if (payments.length + measures.length + birthdays.length === 0) return null

  const remind = async (a: PaymentAlert) => {
    const key = a.client.id
    setBusy(key)
    const text = paymentReminderText(state, a)
    let result = 'Текст скопирован'
    try {
      const r = await api<{ sent: boolean }>('/api/remind/payment', { body: { clientId: a.client.id, text } })
      if (r.sent) result = 'Отправлено в Telegram'
      else if (navigator.share) {
        try {
          await navigator.share({ text })
          result = 'Отправлено'
        } catch {
          await navigator.clipboard.writeText(text)
        }
      } else await navigator.clipboard.writeText(text)
    } catch {
      result = 'Не удалось отправить'
    }
    setBusy(null)
    setDone((d) => ({ ...d, [key]: result }))
  }

  return (
    <div className="strip" role="list">
      {payments.map((a) => {
        const zero = a.pool.remaining <= 0
        const next = a.nextWorkout ? parseLocal(a.nextWorkout.startsAt) : null
        return (
          <article key={`p${a.client.id}`} className={`att-card${zero ? ' att-card--alert' : ' att-card--warn'}`} role="listitem">
            <Link to={`/clients/${a.client.id}`} className="att-card__body">
              <span className="att-card__icon">
                <Wallet size={16} weight="bold" />
              </span>
              <span className="att-card__title">{a.client.name.split(' ')[0]}</span>
              <span className="att-card__text">
                {zero ? 'занятия закончились' : 'последнее занятие'}
                {next ? `, ${formatTime(next)}` : ''}
              </span>
            </Link>
            {done[a.client.id] ? (
              <span className="att-card__done">{done[a.client.id]}</span>
            ) : (
              <button className="btn btn--sm" onClick={() => void remind(a)} disabled={busy === a.client.id}>
                {busy === a.client.id ? '...' : 'Напомнить'}
              </button>
            )}
          </article>
        )
      })}

      {birthdays.map((b) => (
        <Link key={`b${b.client.id}`} to={`/clients/${b.client.id}`} className="att-card att-card--soft" role="listitem">
          <span className="att-card__body">
            <span className="att-card__icon">
              <Cake size={16} weight="bold" />
            </span>
            <span className="att-card__title">{b.client.name.split(' ')[0]}</span>
            <span className="att-card__text">
              {b.inDays === 0 ? 'сегодня день рождения' : b.inDays === 1 ? 'день рождения завтра' : `день рождения через ${b.inDays} дн.`}
              {b.age ? `, ${b.age}` : ''}
            </span>
          </span>
        </Link>
      ))}

      {measures.map((m) => (
        <Link key={`m${m.client.id}`} to={`/clients/${m.client.id}?tab=measurements`} className="att-card" role="listitem">
          <span className="att-card__body">
            <span className="att-card__icon">
              <Ruler size={16} weight="bold" />
            </span>
            <span className="att-card__title">{m.client.name.split(' ')[0]}</span>
            <span className="att-card__text">{m.status.last ? `замеры ${m.status.daysSince} дн. назад` : 'нет начальных замеров'}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}
