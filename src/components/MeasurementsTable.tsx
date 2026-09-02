import type { MeasurementStatus } from '../data/selectors'
import { MEASURE_FIELDS, type Measurement } from '../data/types'
import { formatDateShort, parseLocal } from '../utils/date'

const fmt = (n?: number) => (n === undefined || n === null ? '—' : String(n).replace('.', ','))
const delta = (a?: number, b?: number) => (a === undefined || b === undefined ? undefined : Math.round((a - b) * 10) / 10)

function Delta({ d }: { d?: number }) {
  if (d === undefined || d === 0) return <span className="muted small">{d === 0 ? '±0' : ''}</span>
  // Для замеров тела уменьшение обычно и есть цель, поэтому минус зелёный
  const cls = d < 0 ? 'pill--green' : 'pill--yellow'
  return <span className={`pill ${cls}`}>{d > 0 ? `+${fmt(d)}` : fmt(d)}</span>
}

/** Сводка: последний замер, разница с прошлым и с начальным */
export function MeasurementsSummary({ status }: { status: MeasurementStatus }) {
  const { last, prev, first } = status
  if (!last) return <div className="card empty">Замеров ещё нет</div>
  const fields = MEASURE_FIELDS.filter((f) => last[f.key] !== undefined)
  return (
    <div className="list">
      <div className="row" style={{ paddingBottom: 6 }}>
        <div className="row__body small muted">Показатель</div>
        <div className="small muted" style={{ width: 64, textAlign: 'right' }}>Сейчас</div>
        <div className="small muted" style={{ width: 64, textAlign: 'right' }}>с прошл.</div>
        <div className="small muted" style={{ width: 64, textAlign: 'right' }}>с нач.</div>
      </div>
      {fields.map((f) => (
        <div key={f.key} className="row">
          <div className="row__body">
            <div className="row__title" style={{ fontSize: 15 }}>
              {f.label} <span className="small muted">{f.unit}</span>
            </div>
          </div>
          <div className="bold num" style={{ width: 64, textAlign: 'right' }}>
            {fmt(last[f.key])}
          </div>
          <div style={{ width: 64, textAlign: 'right' }}>
            <Delta d={prev && prev !== last ? delta(last[f.key], prev[f.key]) : undefined} />
          </div>
          <div style={{ width: 64, textAlign: 'right' }}>
            <Delta d={first && first !== last ? delta(last[f.key], first[f.key]) : undefined} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** История замеров, по одному замеру в строке */
export function MeasurementsHistory({ history, onRemove }: { history: Measurement[]; onRemove?: (id: string) => void }) {
  if (history.length === 0) return null
  return (
    <div className="list">
      {history.map((m, i) => (
        <div key={m.id} className="row">
          <div className="row__body">
            <div className="row__title" style={{ fontSize: 15 }}>
              {formatDateShort(parseLocal(m.date))}
              {i === history.length - 1 && <span className="pill pill--accent" style={{ marginLeft: 8 }}>начальные</span>}
            </div>
            <div className="row__sub">
              {MEASURE_FIELDS.filter((f) => m[f.key] !== undefined)
                .map((f) => `${f.label} ${fmt(m[f.key])}`)
                .join(' · ')}
              {m.note ? ` · ${m.note}` : ''}
            </div>
          </div>
          {onRemove && (
            <button className="icon-btn icon-btn--ghost" style={{ color: 'var(--text-3)', width: 28 }} onClick={() => onRemove(m.id)} aria-label="Удалить замер">
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
