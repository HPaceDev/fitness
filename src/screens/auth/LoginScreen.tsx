import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useStore } from '../../data/store'
import { DEMO_PASSWORD } from '../../data/seed'
import { formatPhone } from '../../utils/phone'

export function LoginScreen() {
  const { login } = useAuth()
  const { state } = useStore()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (ph = phone, pw = password) => {
    const r = login(ph, pw)
    if (!r.ok) setError(r.error)
  }

  const demoTrainer = state.users.find((u) => u.role === 'trainer')
  const demoClients = state.users.filter((u) => u.role === 'client' && u.password === DEMO_PASSWORD).slice(0, 2)

  return (
    <div className="app__content app__content--plain">
      <form
        className="auth"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
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
          <button className="btn" type="submit" disabled={!phone || !password}>
            Войти
          </button>
        </div>

        <div className="auth__switch">
          Нет аккаунта?{' '}
          <button type="button" onClick={() => navigate('/register')}>
            Зарегистрироваться
          </button>
        </div>

        <div className="demo">
          <div className="demo__title">Демо-входы (пароль {DEMO_PASSWORD})</div>
          <div className="demo__row">
            {demoTrainer && (
              <button type="button" className="chip chip--active" onClick={() => submit(demoTrainer.phone, DEMO_PASSWORD)}>
                Тренер · {demoTrainer.name.split(' ')[0]}
              </button>
            )}
            {demoClients.map((u) => (
              <button key={u.id} type="button" className="chip" onClick={() => submit(u.phone, DEMO_PASSWORD)}>
                Подопечный · {u.name.split(' ')[0]}
              </button>
            ))}
          </div>
          {demoTrainer && <div className="mt8">Тренер: {formatPhone(demoTrainer.phone)}</div>}
        </div>
      </form>
    </div>
  )
}
