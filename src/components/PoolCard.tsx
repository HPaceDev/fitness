import type { PoolStats } from '../data/selectors'
import { formatMoney } from '../utils/money'
import { sessionsWord } from '../utils/date'
import { Ring } from './Ring'

export function PoolCard({ pool, onPay, payLabel = '+ Оплата' }: { pool: PoolStats; onPay?: () => void; payLabel?: string }) {
  const low = pool.remaining <= 0
  const total = Math.max(pool.purchased, 1)
  const share = pool.remaining / total
  return (
    <div className={`pool${low ? ' pool--low' : ''}`}>
      <div className="pool__main">
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
        <div className="small muted mt8">
          Отходил {pool.used} · {pool.planned > 0 ? `запланировано ${pool.planned}` : 'ничего не запланировано'}
          {pool.planned > pool.remaining && pool.remaining >= 0 && <span style={{ color: 'var(--red-text)' }}> · хватит на {pool.remaining}</span>}
        </div>
      </div>
      <Ring value={share} label={`${Math.max(0, pool.remaining)}`} low={low} />
    </div>
  )
}
