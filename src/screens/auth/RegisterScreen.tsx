import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import type { Role } from '../../data/types'


export function RegisterScreen() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<Exclude<Role, 'admin'>>('client')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    const r = await register({ role, name, phone, password })
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
        <button type="button" className="back" onClick={() => navigate('/login')}>
          ‹ Вход
        </button>
        <h1 className="header__title" style={{ marginBottom: 20 }}>
          Регистрация
        </h1>

        <div className="form">
          {error && <div className="auth__error">{error}</div>}
          <div className="field">
            <span className="field__label">Кто вы</span>
            <div className="role-pick">
              <button type="button" className={`role-pick__item${role === 'client' ? ' role-pick__item--active' : ''}`} onClick={() => setRole('client')}>
                <div className="role-pick__title">Занимаюсь</div>
                <div className="role-pick__sub">Вижу расписание и абонемент</div>
              </button>
              <button type="button" className={`role-pick__item${role === 'trainer' ? ' role-pick__item--active' : ''}`} onClick={() => setRole('trainer')}>
                <div className="role-pick__title">Тренер</div>
                <div className="role-pick__sub">Веду подопечных и оплаты</div>
              </button>
            </div>
          </div>
          <label className="field">
            <span className="field__label">Имя и фамилия</span>
            <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Анна Смирнова" autoComplete="name" />
          </label>
          <label className="field">
            <span className="field__label">Телефон</span>
            <input className="field__input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 900 000-00-00" inputMode="tel" autoComplete="tel" />
            {role === 'client' && <span className="field__hint">Если тренер уже завёл вас по этому телефону, аккаунт привяжется к вашей карточке</span>}
          </label>
          <label className="field">
            <span className="field__label">Пароль</span>
            <input className="field__input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </label>
          <button className="btn" type="submit" disabled={!name || !phone || !password || busy}>
            {busy ? 'Создаём…' : 'Создать аккаунт'}
          </button>
        </div>
      </form>
    </div>
  )
}
