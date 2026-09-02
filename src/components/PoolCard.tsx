import type { PoolStats } from '../data/selectors'
import { formatMoney } from '../utils/money'
import { sessionsWord } from '../utils/date'

export function PoolCard({ pool, onPay, payLabel = '+ Оплата' }: { pool: PoolStats; onPay?: () => void; payLabel?: string }) {
  const low = pool.remaining <= 0
  const total = Math.max(pool.purchased, 1)
  const progress = Math.max(0, Math.min(100, (pool.remaining / total) * 100))
  return (
    <div className={`pool${low ? ' pool--low' : ''}`}>
      <div className="pool__head">
        <div>
          <div className="pool__label">{pool.label}</div>
          <div className="pool__price">{formatMoney(pool.price)} за занятие</div>
        </div>
        {onPay && (
          <button className="btn btn--sm btn--secondary" onClick={onPay}>
            {payLabel}
          </button>
        )}
      </div>
      <div className="pool__big">
        <span className="pool__num num">{pool.remaining}</span>
        <span className="pool__of">
          {pool.remaining < 0 ? `в долг · ${formatMoney(pool.debt)}` : `из ${pool.purchased} ${sessionsWord(pool.purchased)}`}
        </span>
      </div>
      <div className={`progress${low ? ' progress--warn' : ''}`}>
        <div className="progress__fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="small muted mt8">
        {pool.pendingSessions > 0 && <span>Ожидает подтверждения: +{pool.pendingSessions} · </span>}
        {pool.planned > 0 ? `Запланировано ${pool.planned}` : 'Ничего не запланировано'}
        {pool.planned > pool.remaining && pool.remaining >= 0 && <span style={{ color: 'var(--red)' }}> · хватит на {pool.remaining}</span>}
      </div>
    </div>
  )
}
