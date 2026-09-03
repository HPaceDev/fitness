import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export function LoginScreen() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    const r = await login(phone, password)
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
        <div className="auth__switch" style={{ marginTop: 10 }}>
          <button type="button" onClick={() => navigate('/welcome')} style={{ color: 'var(--text-2)', fontWeight: 600 }}>
            Что умеет приложение
          </button>
        </div>

      </form>
    </div>
  )
}
