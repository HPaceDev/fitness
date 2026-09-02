/** Кольцо прогресса: доля от 0 до 1, число внутри */
export function Ring({ value, label, low }: { value: number; label: string; low?: boolean }) {
  const r = 26
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className={`ring${low ? ' ring--low' : ''}`} role="img" aria-label={label}>
      <svg viewBox="0 0 64 64">
        <circle className="ring__track" cx="32" cy="32" r={r} />
        <circle className="ring__fill" cx="32" cy="32" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <div className="ring__label num">{label}</div>
    </div>
  )
}
