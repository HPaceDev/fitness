import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { api, ApiError } from '../../api/client'
import { formatPhone } from '../../utils/phone'
import { markOnboarded } from './WelcomeScreen'

interface Invite {
  trainerName: string
  clientName: string
  phone: string | null
  linked: boolean
}

/** Регистрация по ссылке-приглашению от тренера: имя и телефон уже заполнены */
export function JoinScreen() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { register, login } = useAuth()
  const [invite, setInvite] = useState<Invite | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    markOnboarded()
    api<Invite>(`/api/invite/${token}`)
      .then((i) => {
        setInvite(i)
        setName(i.clientName)
        setPhone(i.phone ? formatPhone(i.phone) : '')
        if (i.linked) setMode('login')
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Ссылка недействительна'))
  }, [token])

  const submit = async () => {
    setBusy(true)
    setError(null)
    const r = mode === 'register' ? await register({ role: 'client', name, phone, password, invite: token }) : await login(phone, password, token)
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
        {invite ? (
          <p className="auth__sub">
            <b>{invite.trainerName}</b> приглашает вас в приложение: расписание, остаток занятий и оплаты в одном месте.
          </p>
        ) : (
          <p className="auth__sub">{error ?? 'Проверяем ссылку…'}</p>
        )}
        {invite && (
          <div className="form">
            {error && <div className="auth__error">{error}</div>}
            {mode === 'register' && (
              <label className="field">
                <span className="field__label">Имя и фамилия</span>
                <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </label>
            )}
            <label className="field">
              <span className="field__label">Телефон</span>
              <input className="field__input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
            </label>
            <label className="field">
              <span className="field__label">{mode === 'register' ? 'Придумайте пароль' : 'Пароль'}</span>
              <input className="field__input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
            </label>
            <button className="btn" type="submit" disabled={!phone || !password || (mode === 'register' && !name) || busy}>
              {busy ? '…' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}
            </button>
            <div className="auth__switch">
              {mode === 'register' ? (
                <>
                  Уже есть аккаунт?{' '}
                  <button type="button" onClick={() => setMode('login')}>
                    Войти
                  </button>
                </>
              ) : (
                <>
                  Нет аккаунта?{' '}
                  <button type="button" onClick={() => setMode('register')}>
                    Зарегистрироваться
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {!invite && error && (
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/login')}>
            На страницу входа
          </button>
        )}
      </form>
    </div>
  )
}
