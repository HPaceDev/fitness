import { useState } from 'react'
import type { ExerciseProgress } from '../data/selectors'
import { formatEntry } from '../data/selectors'
import { formatDateShort, parseLocal } from '../utils/date'

/** Прогресс по упражнениям: последняя запись, сравнение с прошлой, история по тапу */
export function ProgressList({ items, onRemove }: { items: ExerciseProgress[]; onRemove?: (id: string) => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  if (items.length === 0) return <div className="card empty">Записей прогресса пока нет</div>
  return (
    <div className="list">
      {items.map((p) => {
        const open = openKey === p.exercise
        const delta = p.prev && p.last.weightKg !== undefined && p.prev.weightKg !== undefined ? p.last.weightKg - p.prev.weightKg : undefined
        return (
          <div key={p.exercise}>
            <button className="row row--clickable" onClick={() => setOpenKey(open ? null : p.exercise)}>
              <div className="row__body">
                <div className="row__title">{p.exercise}</div>
                <div className="row__sub">
                  {formatDateShort(parseLocal(p.last.date))} · {p.history.length} {p.history.length === 1 ? 'запись' : p.history.length < 5 ? 'записи' : 'записей'}
                </div>
              </div>
              <div className="row__right">
                <div className="bold num">{formatEntry(p.last)}</div>
                {delta !== undefined && delta !== 0 && (
                  <span className={`pill ${delta > 0 ? 'pill--green' : 'pill--yellow'}`}>
                    {delta > 0 ? '+' : ''}
                    {delta} кг
                  </span>
                )}
              </div>
              <span className="row__chevron">{open ? '⌃' : '›'}</span>
            </button>
            {open &&
              p.history.map((e) => (
                <div key={e.id} className="row" style={{ background: 'var(--surface-2)' }}>
                  <div className="row__body">
                    <div className="small">{formatDateShort(parseLocal(e.date))}</div>
                    {e.note && <div className="row__sub">{e.note}</div>}
                  </div>
                  <div className="row__right num">{formatEntry(e)}</div>
                  {onRemove && (
                    <button className="icon-btn icon-btn--ghost" style={{ color: 'var(--text-3)', width: 28 }} onClick={() => onRemove(e.id)} aria-label="Удалить">
                      ×
                    </button>
                  )}
                </div>
              ))}
          </div>
        )
      })}
    </div>
  )
}
