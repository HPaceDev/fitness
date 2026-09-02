import { useAuth } from '../../auth/AuthContext'
import { useStore } from '../../data/store'

export function NoClientCard() {
  const { logout } = useAuth()
  const { error } = useStore()
  return (
    <div className="app__content">
      <header className="header">
        <h1 className="header__title">Профиль</h1>
      </header>
      <div className="card empty">
        {error ?? 'Тренер ещё не добавил вас в свой список.'}
        <br />
        Попросите его завести вас по вашему номеру телефона.
      </div>
      <div className="btn-row">
        <button className="btn btn--secondary" onClick={logout}>
          Выйти
        </button>
      </div>
    </div>
  )
}
