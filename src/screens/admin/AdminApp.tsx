import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { api, ApiError } from '../../api/client'
import { Avatar } from '../../components/Avatar'
import { formatDateShort, parseLocal } from '../../utils/date'
import { formatMoney } from '../../utils/money'
import { formatPhone } from '../../utils/phone'
import './admin.css'

/* ---------- Типы ответов API ---------- */

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
  totals: { trainers: number; trainersActiveWeek: number; clientUsers: number; clients: number; workoutsWeek: number; paymentsMonth: number; paymentsTotal: number }
  trainers: TrainerRow[]
  recentPayments: { id: string; amount: number; sessions: number; date: string; clientName: string; trainerName: string }[]
}
interface ClientRow {
  id: string
  name: string
  phone: string | null
  status: string
  pricePerSession: number
  createdAt: string
  inApp: boolean
  trainerName: string
  trainerId: string
}
interface PaymentRow {
  id: string
  amount: number
  sessions: number
  date: string
  comment: string | null
  clientName: string
  trainerName: string
  groupName: string | null
}

const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'Ошибка запроса')

function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(() => {
    api<T>(path)
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((e: unknown) => setError(errText(e)))
  }, [path])
  useEffect(reload, [reload])
  return { data, error, reload }
}

/* ---------- Оболочка ---------- */

export function AdminApp() {
  const { user, loading } = useAuth()
  if (loading) return <div className="adm-login">Входим…</div>
  if (!user) return <AdminLogin />
  if (user.role !== 'admin') return <NotAdmin />
  return (
    <div className="adm">
      <Sidebar />
      <main className="adm__main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trainers" element={<Trainers />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function Sidebar() {
  const { user, logout } = useAuth()
  const items = [
    { to: '/admin', label: 'Дашборд', end: true, icon: IconGrid },
    { to: '/admin/trainers', label: 'Тренеры', icon: IconPeople },
    { to: '/admin/clients', label: 'Подопечные', icon: IconPerson },
    { to: '/admin/payments', label: 'Оплаты', icon: IconWallet },
  ]
  return (
    <aside className="adm__side">
      <div className="adm__logo">
        Fit<em>Trainer</em> <span style={{ fontSize: 12, color: '#8a8a94', fontWeight: 600 }}>админ</span>
      </div>
      {items.map(({ to, label, end, icon: Icon }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `adm__nav${isActive ? ' adm__nav--active' : ''}`}>
          <Icon />
          {label}
        </NavLink>
      ))}
      <div className="adm__side-bottom">
        <b>{user?.name}</b>
        <button onClick={() => void logout()}>Выйти</button>
      </div>
    </aside>
  )
}

function Page({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="adm__head">
        <div>
          <h1 className="adm__title">{title}</h1>
          {sub && <div className="adm__sub">{sub}</div>}
        </div>
      </div>
      {children}
    </>
  )
}

/* ---------- Вход администратора ---------- */

function AdminLogin() {
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <div className="adm-login">
      <form
        className="adm-login__card form"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const r = await login(phone, password)
          setBusy(false)
          if (!r.ok) setError(r.error)
        }}
      >
        <div>
          <div className="adm-login__logo">
            Fit<em>Trainer</em>
          </div>
          <div className="muted small">Панель администратора</div>
        </div>
        {error && <div className="auth__error">{error}</div>}
        <label className="field">
          <span className="field__label">Телефон администратора</span>
          <input className="field__input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="username" />
        </label>
        <label className="field">
          <span className="field__label">Пароль</span>
          <input className="field__input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <button className="btn" type="submit" disabled={!phone || !password || busy}>
          {busy ? 'Входим…' : 'Войти'}
        </button>
        <div className="field__hint">Телефон и пароль администратора задаются на сервере в файле .env (ADMIN_PHONE, ADMIN_PASSWORD).</div>
      </form>
    </div>
  )
}

function NotAdmin() {
  const { user, logout } = useAuth()
  return (
    <div className="adm-login">
      <div className="adm-login__card form">
        <div className="bold">Нет доступа</div>
        <div className="muted small">
          Вы вошли как {user?.name} ({user?.role === 'trainer' ? 'тренер' : 'подопечный'}). Админка открыта только администратору сервиса.
        </div>
        <button className="btn btn--secondary" onClick={() => void logout()}>
          Выйти и войти как администратор
        </button>
        <a className="btn btn--ghost" href="#/">
          В приложение
        </a>
      </div>
    </div>
  )
}

/* ---------- Дашборд ---------- */

function Dashboard() {
  const { data, error } = useLoad<Overview>('/api/admin/overview')
  if (error) return <div className="auth__error">{error}</div>
  if (!data) return <div className="muted">Загружаем…</div>
  const t = data.totals
  const top = [...data.trainers].sort((a, b) => b.paymentsTotal - a.paymentsTotal).slice(0, 5)
  return (
    <Page title="Дашборд" sub={`Сегодня ${formatDateShort(new Date())}`}>
      <div className="kpis">
        <div className="kpi kpi--accent">
          <div className="kpi__label">Тренеров</div>
          <div className="kpi__value">{t.trainers}</div>
          <div className="kpi__hint">активных за неделю: {t.trainersActiveWeek}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Подопечных</div>
          <div className="kpi__value">{t.clients}</div>
          <div className="kpi__hint">в приложении: {t.clientUsers}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Тренировок за неделю</div>
          <div className="kpi__value">{t.workoutsWeek}</div>
          <div className="kpi__hint">проведённых</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Оплат за месяц</div>
          <div className="kpi__value">{formatMoney(t.paymentsMonth)}</div>
          <div className="kpi__hint">всего за всё время {formatMoney(t.paymentsTotal)}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div className="panel__title">Тренеры по обороту</div>
          <NavLink to="/admin/trainers" className="small" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Все тренеры →
          </NavLink>
        </div>
        <TrainersTable rows={top} compact />
      </div>

      <div className="panel">
        <div className="panel__head">
          <div className="panel__title">Последние оплаты</div>
          <NavLink to="/admin/payments" className="small" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Все оплаты →
          </NavLink>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Подопечный</th>
                <th>Тренер</th>
                <th className="num">Занятий</th>
                <th className="num">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="tbl__empty">Оплат ещё нет</td>
                </tr>
              )}
              {data.recentPayments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateShort(parseLocal(p.date))}</td>
                  <td>{p.clientName}</td>
                  <td>{p.trainerName}</td>
                  <td className="num">{p.sessions}</td>
                  <td className="num bold">{formatMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  )
}

/* ---------- Тренеры ---------- */

function TrainersTable({ rows, compact, onChanged }: { rows: TrainerRow[]; compact?: boolean; onChanged?: () => void }) {
  const toggle = async (t: TrainerRow) => {
    if (!confirm(t.blocked ? `Разблокировать ${t.name}?` : `Заблокировать ${t.name}? Тренер не сможет войти.`)) return
    await api(`/api/admin/trainers/${t.id}`, { method: 'PATCH', body: { blocked: !t.blocked } })
    onChanged?.()
  }
  const remove = async (t: TrainerRow) => {
    if (!confirm(`Удалить ${t.name} вместе со всеми подопечными, тренировками и оплатами? Это необратимо.`)) return
    await api(`/api/admin/trainers/${t.id}`, { method: 'DELETE' })
    onChanged?.()
  }
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Тренер</th>
            <th>Зарегистрирован</th>
            <th>Был</th>
            <th className="num">Подопечных</th>
            <th className="num">Тренировок</th>
            <th className="num">Оплат</th>
            {!compact && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="tbl__empty">Пока никто не зарегистрировался</td>
            </tr>
          )}
          {rows.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="who">
                  <Avatar name={t.name} id={t.id} />
                  <div>
                    <div className="bold">
                      {t.name} {t.blocked && <span className="pill pill--red">заблокирован</span>}
                    </div>
                    <div className="sub">{formatPhone(t.phone)}</div>
                  </div>
                </div>
              </td>
              <td>{formatDateShort(parseLocal(t.createdAt))}</td>
              <td>{t.lastSeenAt ? formatDateShort(parseLocal(t.lastSeenAt)) : '—'}</td>
              <td className="num">{t.clients}</td>
              <td className="num">{t.workouts}</td>
              <td className="num bold">{formatMoney(t.paymentsTotal)}</td>
              {!compact && (
                <td>
                  <div className="actions">
                    <button className={`btn btn--sm ${t.blocked ? 'btn--secondary' : 'btn--secondary'}`} onClick={() => void toggle(t)}>
                      {t.blocked ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                    <button className="btn btn--sm btn--danger" onClick={() => void remove(t)}>
                      Удалить
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Trainers() {
  const { data, error, reload } = useLoad<Overview>('/api/admin/overview')
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    if (!data) return []
    const s = q.trim().toLowerCase()
    return data.trainers.filter((t) => !s || t.name.toLowerCase().includes(s) || t.phone.includes(s.replace(/\D/g, '')))
  }, [data, q])
  if (error) return <div className="auth__error">{error}</div>
  return (
    <Page title="Тренеры" sub={data ? `${data.totals.trainers} всего` : ''}>
      <div className="panel">
        <div className="panel__head">
          <div className="panel__title">Список</div>
          <div className="panel__tools">
            <input placeholder="Поиск по имени или телефону" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {data ? <TrainersTable rows={rows} onChanged={reload} /> : <div className="tbl__empty">Загружаем…</div>}
      </div>
    </Page>
  )
}

/* ---------- Подопечные ---------- */

function Clients() {
  const { data, error } = useLoad<{ clients: ClientRow[] }>('/api/admin/clients')
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    if (!data) return []
    const s = q.trim().toLowerCase()
    return data.clients.filter((c) => !s || c.name.toLowerCase().includes(s) || c.trainerName.toLowerCase().includes(s) || (c.phone ?? '').includes(s.replace(/\D/g, '')))
  }, [data, q])
  if (error) return <div className="auth__error">{error}</div>
  return (
    <Page title="Подопечные" sub={data ? `${data.clients.length} всего · в приложении ${data.clients.filter((c) => c.inApp).length}` : ''}>
      <div className="panel">
        <div className="panel__head">
          <div className="panel__title">Список</div>
          <div className="panel__tools">
            <input placeholder="Поиск по имени, телефону, тренеру" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Подопечный</th>
                <th>Тренер</th>
                <th>Добавлен</th>
                <th className="num">Цена занятия</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {!data && (
                <tr>
                  <td colSpan={5} className="tbl__empty">Загружаем…</td>
                </tr>
              )}
              {data && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="tbl__empty">Никого не найдено</td>
                </tr>
              )}
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="who">
                      <Avatar name={c.name} id={c.id} />
                      <div>
                        <div className="bold">{c.name}</div>
                        <div className="sub">{c.phone ? formatPhone(c.phone) : 'без телефона'}</div>
                      </div>
                    </div>
                  </td>
                  <td>{c.trainerName}</td>
                  <td>{formatDateShort(parseLocal(c.createdAt))}</td>
                  <td className="num">{formatMoney(c.pricePerSession)}</td>
                  <td>
                    {c.inApp ? <span className="pill pill--green">в приложении</span> : <span className="pill pill--gray">без аккаунта</span>}{' '}
                    {c.status === 'paused' && <span className="pill pill--yellow">на паузе</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  )
}

/* ---------- Оплаты ---------- */

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function Payments() {
  const [month, setMonth] = useState(() => monthKey(new Date()))
  const { data, error } = useLoad<{ payments: PaymentRow[] }>(`/api/admin/payments?month=${month}`)
  const months = useMemo(() => {
    const out: string[] = []
    const d = new Date()
    d.setDate(1)
    for (let i = 0; i < 12; i++) {
      out.push(monthKey(d))
      d.setMonth(d.getMonth() - 1)
    }
    return out
  }, [])
  const total = data?.payments.reduce((s, p) => s + p.amount, 0) ?? 0
  if (error) return <div className="auth__error">{error}</div>
  return (
    <Page title="Оплаты" sub={data ? `${data.payments.length} оплат на ${formatMoney(total)}` : ''}>
      <div className="panel">
        <div className="panel__head">
          <div className="panel__title">За месяц</div>
          <div className="panel__tools">
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Подопечный</th>
                <th>Тренер</th>
                <th>Абонемент</th>
                <th className="num">Занятий</th>
                <th className="num">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {!data && (
                <tr>
                  <td colSpan={6} className="tbl__empty">Загружаем…</td>
                </tr>
              )}
              {data && data.payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="tbl__empty">В этом месяце оплат нет</td>
                </tr>
              )}
              {data?.payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateShort(parseLocal(p.date))}</td>
                  <td>{p.clientName}</td>
                  <td>{p.trainerName}</td>
                  <td>
                    {p.groupName ?? 'персональные'}
                    {p.comment && <div className="sub">{p.comment}</div>}
                  </td>
                  <td className="num">{p.sessions}</td>
                  <td className="num bold">{formatMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  )
}

/* ---------- Иконки ---------- */

const svg = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
function IconGrid() {
  return (
    <svg {...svg}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  )
}
function IconPeople() {
  return (
    <svg {...svg}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 20a5 5 0 0 1 6-4" />
    </svg>
  )
}
function IconPerson() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}
function IconWallet() {
  return (
    <svg {...svg}>
      <rect x="3" y="6" width="18" height="14" rx="3" />
      <path d="M3 10h18M16 15h2" />
    </svg>
  )
}
