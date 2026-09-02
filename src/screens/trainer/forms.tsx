import { useMemo, useState } from 'react'
import { useStore } from '../../data/store'
import { Sheet } from '../../components/Sheet'
import { clientById, groupById, groupsOfClient } from '../../data/selectors'
import type { Client, Group } from '../../data/types'
import { toLocalInput, sessionsWord } from '../../utils/date'
import { formatMoney } from '../../utils/money'
import { uid } from '../../utils/id'
import { normalizePhone } from '../../utils/phone'

const nowIso = () => new Date().toISOString()

/* ---------------- Подопечный: добавить / изменить ---------------- */

export function ClientSheet({ open, onClose, clientId, onRemoved }: { open: boolean; onClose: () => void; clientId?: string; onRemoved?: () => void }) {
  const { state, dispatch } = useStore()
  const existing = clientId ? clientById(state, clientId) : undefined
  const [name, setName] = useState(existing?.name ?? '')
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [price, setPrice] = useState(String(existing?.pricePerSession ?? 3000))
  const [note, setNote] = useState(existing?.note ?? '')

  const valid = name.trim().length > 1 && Number(price) > 0

  const submit = () => {
    if (!valid) return
    const patch = { name: name.trim(), phone: phone.trim() ? normalizePhone(phone) : undefined, pricePerSession: Number(price), note: note.trim() || undefined }
    if (existing) dispatch({ type: 'client/update', id: existing.id, patch })
    else {
      const client: Client = { id: uid('c'), createdAt: nowIso(), ...patch }
      dispatch({ type: 'client/add', client })
    }
    onClose()
  }

  const remove = () => {
    if (!existing) return
    if (!confirm(`Удалить ${existing.name} вместе с оплатами и тренировками?`)) return
    dispatch({ type: 'client/remove', id: existing.id })
    onClose()
    onRemoved?.()
  }

  return (
    <Sheet open={open} title={existing ? 'Подопечный' : 'Новый подопечный'} onClose={onClose}>
      <div className="form">
        <label className="field">
          <span className="field__label">Имя</span>
          <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Анна Смирнова" autoFocus={!existing} />
        </label>
        <label className="field">
          <span className="field__label">Телефон</span>
          <input className="field__input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 ..." inputMode="tel" />
          <span className="field__hint">По телефону подопечный привяжет свой аккаунт при регистрации</span>
        </label>
        <label className="field">
          <span className="field__label">Цена персонального занятия, ₽</span>
          <input className="field__input" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
        </label>
        <label className="field">
          <span className="field__label">Заметка</span>
          <textarea className="field__input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Травмы, цели, пожелания" />
        </label>
        <button className="btn" disabled={!valid} onClick={submit}>
          {existing ? 'Сохранить' : 'Добавить'}
        </button>
        {existing && (
          <button className="btn btn--danger" onClick={remove}>
            Удалить подопечного
          </button>
        )}
      </div>
    </Sheet>
  )
}

/* ---------------- Группа: добавить / изменить ---------------- */

export function GroupSheet({ open, onClose, groupId, onRemoved }: { open: boolean; onClose: () => void; groupId?: string; onRemoved?: () => void }) {
  const { state, dispatch } = useStore()
  const existing = groupId ? groupById(state, groupId) : undefined
  const [name, setName] = useState(existing?.name ?? '')
  const [price, setPrice] = useState(String(existing?.pricePerSession ?? 1500))

  const valid = name.trim().length > 1 && Number(price) > 0

  const submit = () => {
    if (!valid) return
    if (existing) dispatch({ type: 'group/update', id: existing.id, patch: { name: name.trim(), pricePerSession: Number(price) } })
    else {
      const group: Group = { id: uid('g'), name: name.trim(), pricePerSession: Number(price), memberIds: [], createdAt: nowIso() }
      dispatch({ type: 'group/add', group })
    }
    onClose()
  }

  const remove = () => {
    if (!existing) return
    if (!confirm(`Удалить группу «${existing.name}» вместе с её тренировками и абонементами?`)) return
    dispatch({ type: 'group/remove', id: existing.id })
    onClose()
    onRemoved?.()
  }

  return (
    <Sheet open={open} title={existing ? 'Группа' : 'Новая группа'} onClose={onClose}>
      <div className="form">
        <label className="field">
          <span className="field__label">Название</span>
          <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Утренняя функционалка" autoFocus={!existing} />
        </label>
        <label className="field">
          <span className="field__label">Цена занятия для каждого участника, ₽</span>
          <input className="field__input" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
          <span className="field__hint">Одна цена на всю группу. Абонементы на группу считаются отдельно от персональных.</span>
        </label>
        <button className="btn" disabled={!valid} onClick={submit}>
          {existing ? 'Сохранить' : 'Создать группу'}
        </button>
        {existing && (
          <button className="btn btn--danger" onClick={remove}>
            Удалить группу
          </button>
        )}
      </div>
    </Sheet>
  )
}

/* ---------------- Добавить участников в группу ---------------- */

export function AddMembersSheet({ open, onClose, groupId }: { open: boolean; onClose: () => void; groupId: string }) {
  const { state, dispatch } = useStore()
  const group = groupById(state, groupId)
  const candidates = useMemo(
    () => state.clients.filter((c) => !group?.memberIds.includes(c.id)).sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [state.clients, group],
  )
  return (
    <Sheet open={open} title="Добавить в группу" onClose={onClose}>
      <div className="list">
        {candidates.length === 0 && <div className="empty">Все подопечные уже в группе</div>}
        {candidates.map((c) => (
          <button key={c.id} className="row row--clickable" onClick={() => dispatch({ type: 'group/addMember', id: groupId, clientId: c.id })}>
            <div className="row__body">
              <div className="row__title">{c.name}</div>
            </div>
            <span className="pill pill--accent">+ Добавить</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/* ---------------- Оплата ---------------- */

const PACKS = [1, 4, 8, 10, 12]

export function AddPaymentSheet({
  open,
  onClose,
  clientId,
  defaultGroupId,
}: {
  open: boolean
  onClose: () => void
  clientId: string
  defaultGroupId?: string
}) {
  const { state, dispatch } = useStore()
  const client = clientById(state, clientId)
  const groups = client ? groupsOfClient(state, client.id) : []
  const [groupId, setGroupId] = useState<string>(defaultGroupId ?? '')
  const priceFor = (gid: string) => (gid ? (groupById(state, gid)?.pricePerSession ?? 0) : (client?.pricePerSession ?? 0))
  const [sessions, setSessions] = useState('8')
  const [amount, setAmount] = useState(() => String(priceFor(defaultGroupId ?? '') * 8))
  const [amountTouched, setAmountTouched] = useState(false)
  const [date, setDate] = useState(() => toLocalInput(new Date()).slice(0, 10))
  const [comment, setComment] = useState('')

  const recompute = (n: number, gid: string) => {
    if (!amountTouched) setAmount(String(priceFor(gid) * n))
  }
  const pickSessions = (n: number) => {
    setSessions(String(n))
    recompute(n, groupId)
  }
  const pickGroup = (gid: string) => {
    setGroupId(gid)
    recompute(Number(sessions) || 0, gid)
  }

  const valid = Number(sessions) > 0 && Number(amount) >= 0 && !!client
  const perSession = Number(sessions) > 0 ? Math.round(Number(amount) / Number(sessions)) : 0

  const submit = () => {
    if (!valid) return
    dispatch({
      type: 'payment/add',
      payment: {
        id: uid('p'),
        clientId,
        groupId: groupId || undefined,
        sessions: Number(sessions),
        amount: Number(amount),
        date,
        comment: comment.trim() || undefined,
      },
    })
    onClose()
  }

  if (!client) return null
  return (
    <Sheet open={open} title="Оплата" onClose={onClose}>
      <div className="form">
        {groups.length > 0 && (
          <div className="field">
            <span className="field__label">Абонемент на</span>
            <div className="chips">
              <button className={`chip${groupId === '' ? ' chip--active' : ''}`} onClick={() => pickGroup('')}>
                Персональные
              </button>
              {groups.map((g) => (
                <button key={g.id} className={`chip${groupId === g.id ? ' chip--active' : ''}`} onClick={() => pickGroup(g.id)}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <span className="field__label">Пакет</span>
          <div className="chips">
            {PACKS.map((n) => (
              <button key={n} className={`chip${Number(sessions) === n ? ' chip--active' : ''}`} onClick={() => pickSessions(n)}>
                {n} {sessionsWord(n)}
              </button>
            ))}
          </div>
        </div>
        <div className="field-row">
          <label className="field">
            <span className="field__label">Занятий</span>
            <input className="field__input" value={sessions} inputMode="numeric" onChange={(e) => pickSessions(Number(e.target.value) || 0)} />
          </label>
          <label className="field">
            <span className="field__label">Сумма, ₽</span>
            <input
              className="field__input"
              value={amount}
              inputMode="numeric"
              onChange={(e) => {
                setAmountTouched(true)
                setAmount(e.target.value)
              }}
            />
          </label>
        </div>
        <span className="field__hint">
          {perSession > 0 ? `${formatMoney(perSession)} за занятие` : ' '} · обычная цена {formatMoney(priceFor(groupId))}
        </span>
        <label className="field">
          <span className="field__label">Дата оплаты</span>
          <input className="field__input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Комментарий</span>
          <input className="field__input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Перевод на карту" />
        </label>
        <button className="btn" disabled={!valid} onClick={submit}>
          Записать {formatMoney(Number(amount) || 0)}
        </button>
      </div>
    </Sheet>
  )
}

/* ---------------- Тренировка ---------------- */

const DURATIONS = [45, 60, 90]

export function AddWorkoutSheet({
  open,
  onClose,
  clientId,
  groupId,
  defaultDate,
}: {
  open: boolean
  onClose: () => void
  clientId?: string
  groupId?: string
  defaultDate?: Date
}) {
  const { state, dispatch } = useStore()
  const clients = useMemo(() => [...state.clients].sort((a, b) => a.name.localeCompare(b.name, 'ru')), [state.clients])
  const groups = state.groups
  const [kind, setKind] = useState<'personal' | 'group'>(groupId ? 'group' : 'personal')
  const [client, setClient] = useState(clientId ?? clients[0]?.id ?? '')
  const [group, setGroup] = useState(groupId ?? groups[0]?.id ?? '')
  const [startsAt, setStartsAt] = useState(() => {
    const d = defaultDate ? new Date(defaultDate) : new Date()
    const now = new Date()
    d.setHours(now.getHours() + 1, 0, 0, 0)
    return toLocalInput(d)
  })
  const [duration, setDuration] = useState(60)
  const [repeatWeeks, setRepeatWeeks] = useState(0)

  const fixed = !!clientId || !!groupId
  const valid = !!startsAt && (kind === 'personal' ? !!client : !!group)

  const submit = () => {
    if (!valid) return
    const base = new Date(startsAt)
    for (let i = 0; i <= repeatWeeks; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() + i * 7)
      dispatch({
        type: 'workout/add',
        workout: {
          id: uid('w'),
          clientId: kind === 'personal' ? client : undefined,
          groupId: kind === 'group' ? group : undefined,
          startsAt: d.toISOString(),
          durationMin: duration,
          status: 'planned',
        },
      })
    }
    onClose()
  }

  return (
    <Sheet open={open} title="Новая тренировка" onClose={onClose}>
      <div className="form">
        {!fixed && groups.length > 0 && (
          <div className="seg">
            <button className={`seg__item${kind === 'personal' ? ' seg__item--active' : ''}`} onClick={() => setKind('personal')}>
              Персональная
            </button>
            <button className={`seg__item${kind === 'group' ? ' seg__item--active' : ''}`} onClick={() => setKind('group')}>
              Групповая
            </button>
          </div>
        )}
        {!fixed && kind === 'personal' && (
          <label className="field">
            <span className="field__label">Подопечный</span>
            <select className="field__input" value={client} onChange={(e) => setClient(e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {!fixed && kind === 'group' && (
          <label className="field">
            <span className="field__label">Группа</span>
            <select className="field__input" value={group} onChange={(e) => setGroup(e.target.value)}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.memberIds.length} чел.
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span className="field__label">Дата и время</span>
          <input className="field__input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </label>
        <div className="field">
          <span className="field__label">Длительность</span>
          <div className="seg">
            {DURATIONS.map((d) => (
              <button key={d} className={`seg__item${duration === d ? ' seg__item--active' : ''}`} onClick={() => setDuration(d)}>
                {d} мин
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field__label">Повторять еженедельно</span>
          <div className="seg">
            {[0, 3, 7].map((n) => (
              <button key={n} className={`seg__item${repeatWeeks === n ? ' seg__item--active' : ''}`} onClick={() => setRepeatWeeks(n)}>
                {n === 0 ? 'Нет' : `${n + 1} нед.`}
              </button>
            ))}
          </div>
        </div>
        <button className="btn" disabled={!valid} onClick={submit}>
          Добавить {repeatWeeks > 0 ? `(${repeatWeeks + 1} шт.)` : ''}
        </button>
      </div>
    </Sheet>
  )
}
