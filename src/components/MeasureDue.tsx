import { Link } from 'react-router-dom'
import { useStore } from '../data/store'
import { measurementsDue } from '../data/selectors'

/** Напоминание тренеру: кому пора делать замеры */
export function MeasureDue() {
  const { state } = useStore()
  const due = measurementsDue(state)
  if (due.length === 0) return null
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="bold">📏 Пора сделать замеры</div>
      <div className="small muted" style={{ marginTop: 4 }}>
        {due.map((d, i) => (
          <span key={d.client.id}>
            {i > 0 && ', '}
            <Link to={`/clients/${d.client.id}?tab=measurements`} style={{ color: 'var(--accent)', fontWeight: 700 }}>
              {d.client.name.split(' ')[0]}
            </Link>
            {d.status.last ? ` (${d.status.daysSince} дн.)` : ' (нет начальных)'}
          </span>
        ))}
      </div>
    </div>
  )
}
