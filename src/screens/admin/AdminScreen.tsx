import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { api, ApiError } from '../../api/client'
import { Avatar } from '../../components/Avatar'
import { formatDateShort, parseLocal } from '../../utils/date'
import { formatMoney } from '../../utils/money'
import { formatPhone } from '../../utils/phone'

interface TrainerRow {
  id: string
  name: string
  phone: string
  blocked: boolean
  createdAt: string
  lastSeenAt: string | null
  clients: number
  workouts: number
  lastWorkoutAt: string | null
  paymentsTotal: number
}
interface Overview {
  totals: { trainers: number; clientUsers: number }
  trainers: TrainerRow[]
}

/** Админка владельца сервиса: кто из тренеров пользуется и как активно */
export function AdminScreen() {
  const { user, logout } = useAuth()
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api<Overview>('/api/admin/overview')
      .then(setData)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Ошибка'))
  }, [])
  useEffect(load, [load])

  const toggle = async (t: TrainerRow) => {
    if (!confirm(t.blocked ? `Разблокировать ${t.name}?` : `Заблокировать ${t.name}? Тренер не сможет войти.`)) return
    await api(`/api/admin/trainers/${t.id}`, { method: 'PATCH', body: { blocked: !t.blocked } })
    load()
  }

  return (
    <div className="app__content app__content--plain">
      <header className="header">
        <div>
          <h1 className="header__title">Админка</h1>
          <p className="header__sub">{user?.name}</p>
        </div>
        <button className="btn btn--secondary btn--sm" onClick={() => void logout()}>
          Выйти
        </button>
      </header>

      {error && <div className="auth__error">{error}</div>}
      {data && (
        <>
          <div className="stats">
            <div className="stat stat--accent">
              <div className="stat__label">Тренеров</div>
              <div className="stat__value num">{data.totals.trainers}</div>
            </div>
            <div className="stat">
              <div className="stat__label">Подопечных в приложении</div>
              <div className="stat__value num">{data.totals.clientUsers}</div>
            </div>
          </div>

          <section className="section">
            <div className="section__title">Тренеры</div>
            <div className="list">
              {data.trainers.length === 0 && <div className="empty">Пока никто не зарегистрировался</div>}
              {data.trainers.map((t) => (
                <div key={t.id} className="row row--stack">
                  <div className="flex" style={{ gap: 12 }}>
                    <Avatar name={t.name} id={t.id} />
                    <div className="row__body">
                      <div className="row__title">
                        {t.name} {t.blocked && <span className="pill pill--red">Заблокирован</span>}
                      </div>
                      <div className="row__sub">
                        {formatPhone(t.phone)} · с {formatDateShort(parseLocal(t.createdAt))}
                        {t.lastSeenAt ? ` · был ${formatDateShort(parseLocal(t.lastSeenAt))}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex between small">
                    <span className="muted">
                      {t.clients} подопечных · {t.workouts} тренировок · оплат на {formatMoney(t.paymentsTotal)}
                    </span>
                    <button className={`btn btn--sm ${t.blocked ? 'btn--secondary' : 'btn--danger'}`} onClick={() => void toggle(t)}>
                      {t.blocked ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
