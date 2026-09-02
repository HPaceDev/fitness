import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { api } from '../../api/client'

interface DemoLogin {
  label: string
  phone: string
  password: string
}

export function LoginScreen() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState<DemoLogin[]>([])

  useEffect(() => {
    api<{ demo: boolean; demoLogins: DemoLogin[] }>('/api/config')
      .then((c) => setDemo(c.demoLogins ?? []))
      .catch(() => setDemo([]))
  }, [])

  const submit = async (ph = phone, pw = password) => {
    setBusy(true)
    setError(null)
    const r = await login(ph, pw)
    setBusy(false)
    if (!r.ok) setError(r.error)
  }

  return (
    <div className="app__content app__content--plain">
      <form
        className="auth"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="auth__logo">
          Fit<em>Trainer</em>
        </div>
        <p className="auth__sub">Расписание, абонементы и оплаты для тренера и его подопечных</p>

        <div className="form">
          {error && <div className="auth__error">{error}</div>}
          <label className="field">
            <span className="field__label">Телефон</span>
            <input className="field__input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 900 000-00-00" inputMode="tel" autoComplete="tel" />
          </label>
          <label className="field">
            <span className="field__label">Пароль</span>
            <input className="field__input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          <button className="btn" type="submit" disabled={!phone || !password || busy}>
            {busy ? 'Входим…' : 'Войти'}
          </button>
        </div>

        <div className="auth__switch">
          Нет аккаунта?{' '}
          <button type="button" onClick={() => navigate('/register')}>
            Зарегистрироваться
          </button>
        </div>

        {demo.length > 0 && (
          <div className="demo">
            <div className="demo__title">Демо-входы (пароль {demo[0]!.password})</div>
            <div className="demo__row">
              {demo.map((d, i) => (
                <button key={d.phone} type="button" className={`chip${i === 0 ? ' chip--active' : ''}`} onClick={() => submit(d.phone, d.password)} disabled={busy}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
