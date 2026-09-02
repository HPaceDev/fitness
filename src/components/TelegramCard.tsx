import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

interface Status {
  enabled: boolean
  bot: string | null
  linked: boolean
}

/** Подключение Telegram-уведомлений. Не показывается, если бот на сервере не настроен. */
export function TelegramCard({ role }: { role: 'trainer' | 'client' }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const load = useCallback(() => {
    api<Status>('/api/telegram/status')
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [])
  useEffect(load, [load])
  useEffect(() => {
    if (!link) return
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [link, load])
  useEffect(() => {
    if (status?.linked) setLink(null)
  }, [status?.linked])

  if (!status?.enabled) return null

  const connect = async () => {
    const r = await api<{ code: string; url: string | null }>('/api/telegram/link', { method: 'POST', body: {} })
    if (r.url) {
      setLink(r.url)
      window.open(r.url, '_blank', 'noopener')
    }
  }
  const disconnect = async () => {
    if (!confirm('Отключить уведомления в Telegram?')) return
    await api('/api/telegram/link', { method: 'DELETE' })
    load()
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="flex between">
        <div>
          <div className="bold">Уведомления в Telegram</div>
          <div className="small muted">
            {status.linked
              ? 'Подключены'
              : role === 'trainer'
                ? 'План на завтра, дни рождения, заканчивающиеся абонементы'
                : 'Напоминания о тренировках и остатке занятий'}
          </div>
        </div>
        {status.linked ? (
          <button className="btn btn--sm btn--secondary" onClick={disconnect}>
            Отключить
          </button>
        ) : (
          <button className="btn btn--sm" onClick={connect}>
            Подключить
          </button>
        )}
      </div>
      {link && !status.linked && (
        <div className="small muted mt8">
          Если Telegram не открылся, перейдите по ссылке:{' '}
          <a href={link} target="_blank" rel="noopener" style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>
            {link}
          </a>
          , нажмите «Start». Статус обновится сам.
        </div>
      )}
    </div>
  )
}
