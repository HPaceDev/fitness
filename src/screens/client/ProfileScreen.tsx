import { useAuth } from '../../auth/AuthContext'
import { useStore } from '../../data/store'
import { clientByUser, clientStats, groupsOfClient } from '../../data/selectors'
import { Avatar } from '../../components/Avatar'
import { formatPhone } from '../../utils/phone'
import { formatMoney } from '../../utils/money'
import { formatDateShort, parseLocal } from '../../utils/date'

export function ProfileScreen() {
  const { user, logout } = useAuth()
  const { state, dispatch } = useStore()
  if (!user) return null
  const client = clientByUser(state, user.id)
  const trainer = state.users.find((u) => u.role === 'trainer')
  const stats = client ? clientStats(state, client) : null
  const groups = client ? groupsOfClient(state, client.id) : []

  return (
    <div className="app__content">
      <header className="header">
        <h1 className="header__title">Профиль</h1>
      </header>

      <div className="profile">
        <Avatar name={user.name} id={client?.id ?? user.id} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile__name">{user.name}</div>
          <div className="profile__sub">{formatPhone(user.phone)}</div>
        </div>
      </div>

      <div className="list">
        <div className="row">
          <div className="row__body">
            <div className="row__sub">Тренер</div>
            <div className="row__title">{trainer?.name ?? '—'}</div>
          </div>
          {trainer && <div className="row__right small muted">{formatPhone(trainer.phone)}</div>}
        </div>
        {client && (
          <div className="row">
            <div className="row__body">
              <div className="row__sub">Цена персонального занятия</div>
              <div className="row__title">{formatMoney(client.pricePerSession)}</div>
            </div>
          </div>
        )}
        {groups.length > 0 && (
          <div className="row">
            <div className="row__body">
              <div className="row__sub">Группы</div>
              <div className="row__title">{groups.map((g) => `${g.name} (${formatMoney(g.pricePerSession)})`).join(', ')}</div>
            </div>
          </div>
        )}
        {stats && (
          <div className="row">
            <div className="row__body">
              <div className="row__sub">Занимается с</div>
              <div className="row__title">{formatDateShort(parseLocal(client!.createdAt))}</div>
            </div>
            <div className="row__right small muted">{stats.pools.reduce((s, p) => s + p.used, 0)} проведено</div>
          </div>
        )}
      </div>

      <div className="btn-row" style={{ marginTop: 20 }}>
        <button className="btn btn--secondary" onClick={logout}>
          Выйти
        </button>
      </div>

      <section className="section">
        <div className="card small muted">
          Прототип хранит данные в браузере. Сервера пока нет.
          <div className="btn-row">
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => {
                if (confirm('Сбросить все данные к демо-набору?')) {
                  dispatch({ type: 'reset' })
                  logout()
                }
              }}
            >
              Сбросить к демо-данным
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
