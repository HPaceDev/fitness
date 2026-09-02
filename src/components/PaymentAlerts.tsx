import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../data/store'
import { paymentAlerts, paymentReminderText, type PaymentAlert } from '../data/selectors'
import { api } from '../api/client'
import { formatDayLong, formatTime, parseLocal } from '../utils/date'

/** Подсказки тренеру: у кого последнее оплаченное занятие, с кнопкой «напомнить» */
export function PaymentAlerts() {
  const { state } = useStore()
  const alerts = paymentAlerts(state)
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, string>>({})
  if (alerts.length === 0) return null

  const remind = async (a: PaymentAlert) => {
    const key = `${a.client.id}:${a.pool.key}`
    setBusy(key)
    const text = paymentReminderText(state, a)
    let result = 'Текст скопирован, отправьте подопечному'
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
    <div style={{ marginBottom: 12 }}>
      {alerts.map((a) => {
        const key = `${a.client.id}:${a.pool.key}`
        const zero = a.pool.remaining <= 0
        return (
          <div key={key} className="card alert" style={{ borderColor: zero ? 'rgba(255,92,92,0.35)' : 'rgba(255,200,87,0.35)' }}>
            <div className="flex between" style={{ gap: 10 }}>
              <Link to={`/clients/${a.client.id}`} style={{ minWidth: 0, flex: 1 }}>
                <div className="bold">
                  {a.client.name.split(' ')[0]}: {zero ? 'занятия закончились' : 'последнее оплаченное занятие'}
                </div>
                <div className="small muted">
                  {a.pool.label}
                  {a.nextWorkout ? ` · ${formatDayLong(parseLocal(a.nextWorkout.startsAt))}, ${formatTime(parseLocal(a.nextWorkout.startsAt))}` : ''}
                  {zero && a.pool.planned > 0 ? ` · запланировано ${a.pool.planned}` : ''}
                </div>
              </Link>
              <button className="btn btn--sm" onClick={() => void remind(a)} disabled={busy === key}>
                {busy === key ? '…' : 'Напомнить'}
              </button>
            </div>
            {done[key] && <div className="small mt8" style={{ color: 'var(--green-text)' }}>{done[key]}</div>}
          </div>
        )
      })}
    </div>
  )
}
