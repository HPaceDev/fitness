import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../data/store'
import { clientById, clientStats, groupById } from '../../data/selectors'
import type { Workout } from '../../data/types'
import { Avatar } from '../../components/Avatar'
import { SessionsPill } from '../../components/StatusPill'
import { WorkoutCard } from '../../components/WorkoutCard'
import { PencilSimple } from '../../components/icons'
import { formatMoney } from '../../utils/money'
import { formatDayLong, parseLocal } from '../../utils/date'
import { AddMembersSheet, AddWorkoutSheet, GroupSheet } from './forms'
import { WorkoutSheet } from './WorkoutSheet'

export function GroupScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const group = groupById(state, id)
  const [editing, setEditing] = useState(false)
  const [addingMembers, setAddingMembers] = useState(false)
  const [addingWorkout, setAddingWorkout] = useState(false)
  const [openWorkout, setOpenWorkout] = useState<Workout | null>(null)

  const workouts = useMemo(() => state.workouts.filter((w) => w.groupId === id).sort((a, b) => b.startsAt.localeCompare(a.startsAt)), [state.workouts, id])
  const upcoming = workouts.filter((w) => w.status === 'planned').reverse()
  const past = workouts.filter((w) => w.status !== 'planned')

  if (!group) {
    return (
      <div className="app__content">
        <button className="back" onClick={() => navigate('/clients')}>
          ‹ Подопечные
        </button>
        <div className="empty">Группа не найдена</div>
      </div>
    )
  }

  return (
    <div className="app__content">
      <button className="back" onClick={() => navigate(-1)}>
        ‹ Назад
      </button>

      <div className="profile">
        <span className="group-mark" style={{ width: 64, height: 64, fontSize: 22, borderRadius: 18 }}>
          {group.name.slice(0, 2).toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile__name">{group.name}</div>
          <div className="profile__sub">
            {group.memberIds.length} чел. · {formatMoney(group.pricePerSession)} за занятие
          </div>
        </div>
        <button className="icon-btn icon-btn--ghost" onClick={() => setEditing(true)} aria-label="Редактировать">
          <PencilSimple size={20} />
        </button>
      </div>

      <div className="btn-row" style={{ marginTop: 0 }}>
        <button className="btn" onClick={() => setAddingWorkout(true)}>
          + Тренировка
        </button>
        <button className="btn btn--secondary" onClick={() => setAddingMembers(true)}>
          + Участник
        </button>
      </div>

      <section className="section">
        <div className="section__title">
          <span>Участники</span>
          <small>остаток занятий</small>
        </div>
        <div className="list">
          {group.memberIds.length === 0 && <div className="empty">В группе пока никого</div>}
          {group.memberIds.map((cid) => {
            const c = clientById(state, cid)
            if (!c) return null
            const pool = clientStats(state, c).pool
            return (
              <div key={cid} className="row">
                <Link to={`/clients/${cid}`} style={{ display: 'contents' }}>
                  <Avatar name={c.name} id={c.id} />
                  <div className="row__body">
                    <div className="row__title">{c.name}</div>
                    <div className="row__sub">{pool ? `проведено ${pool.used}` : ''}</div>
                  </div>
                </Link>
                {pool && <SessionsPill remaining={pool.remaining} />}
                <button
                  className="icon-btn icon-btn--ghost"
                  style={{ color: 'var(--text-3)', width: 28 }}
                  aria-label="Убрать из группы"
                  onClick={() => {
                    if (confirm(`Убрать ${c.name} из группы?`)) dispatch({ type: 'group/removeMember', id: group.id, clientId: cid })
                  }}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Ближайшие</div>
        {upcoming.length === 0 && <div className="card empty">Ничего не запланировано</div>}
        {upcoming.map((w) => (
          <div key={w.id} style={{ marginBottom: 8 }}>
            <div className="small muted" style={{ margin: '0 4px 4px' }}>
              {formatDayLong(parseLocal(w.startsAt))}
            </div>
            <WorkoutCard workout={w} onClick={() => setOpenWorkout(w)} />
          </div>
        ))}
      </section>

      {past.length > 0 && (
        <section className="section">
          <div className="section__title">Прошедшие</div>
          {past.map((w) => (
            <div key={w.id} style={{ marginBottom: 8 }}>
              <div className="small muted" style={{ margin: '0 4px 4px' }}>
                {formatDayLong(parseLocal(w.startsAt))}
              </div>
              <WorkoutCard workout={w} onClick={() => setOpenWorkout(w)} />
            </div>
          ))}
        </section>
      )}

      <GroupSheet key={`g-${editing}`} open={editing} onClose={() => setEditing(false)} groupId={group.id} onRemoved={() => navigate('/clients')} />
      <AddMembersSheet open={addingMembers} onClose={() => setAddingMembers(false)} groupId={group.id} />
      <AddWorkoutSheet key={`w-${addingWorkout}`} open={addingWorkout} onClose={() => setAddingWorkout(false)} groupId={group.id} />
      <WorkoutSheet workout={openWorkout} onClose={() => setOpenWorkout(null)} />
    </div>
  )
}
