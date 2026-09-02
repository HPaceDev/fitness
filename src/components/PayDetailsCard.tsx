import { useState } from 'react'
import { useStore } from '../data/store'

/** Реквизиты тренера: подставляются в напоминание об оплате */
export function PayDetailsCard() {
  const { state, dispatch } = useStore()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(state.trainer?.payDetails ?? '')
  const save = () => {
    dispatch({ type: 'trainer/update', patch: { payDetails: value.trim() } })
    setEditing(false)
  }
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="flex between">
        <div style={{ minWidth: 0 }}>
          <div className="bold">Реквизиты для оплаты</div>
          <div className="small muted" style={{ overflowWrap: 'anywhere' }}>{state.trainer?.payDetails || 'Не указаны. Они подставляются в напоминания подопечным.'}</div>
        </div>
        {!editing && (
          <button className="btn btn--sm btn--secondary" onClick={() => setEditing(true)}>
            Изменить
          </button>
        )}
      </div>
      {editing && (
        <div className="form mt12">
          <input className="field__input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Сбер по номеру +7 900 000-00-00, Алексей Г." autoFocus />
          <div className="btn-row" style={{ marginTop: 0 }}>
            <button className="btn btn--sm" onClick={save}>
              Сохранить
            </button>
            <button className="btn btn--sm btn--secondary" onClick={() => setEditing(false)}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
