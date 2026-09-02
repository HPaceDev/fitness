import { useState } from 'react'
import { useStore } from '../data/store'
import { measurementStatus } from '../data/selectors'
import { clientById } from '../data/selectors'
import { MEASURE_FIELDS, type MeasureKey } from '../data/types'
import { Sheet } from './Sheet'
import { toLocalInput } from '../utils/date'
import { uid } from '../utils/id'

/** Замеры: поля подставляются из прошлого замера, меняешь только то, что изменилось */
export function MeasurementSheet({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const { state, dispatch } = useStore()
  const client = clientById(state, clientId)
  const last = client ? measurementStatus(state, client).last : undefined
  const [date, setDate] = useState(toLocalInput(new Date()).slice(0, 10))
  const [values, setValues] = useState<Record<MeasureKey, string>>(() => {
    const v = {} as Record<MeasureKey, string>
    for (const f of MEASURE_FIELDS) v[f.key] = last?.[f.key] !== undefined ? String(last[f.key]) : ''
    return v
  })
  const [note, setNote] = useState('')

  const filled = MEASURE_FIELDS.some((f) => values[f.key].trim() !== '')

  const submit = () => {
    if (!filled) return
    const entry: Record<string, unknown> = { id: uid(), clientId, date, note: note.trim() || undefined }
    for (const f of MEASURE_FIELDS) {
      const raw = values[f.key].trim().replace(',', '.')
      if (raw !== '' && !Number.isNaN(Number(raw))) entry[f.key] = Number(raw)
    }
    dispatch({ type: 'measurement/add', entry: entry as never })
    onClose()
  }

  return (
    <Sheet open={open} title={last ? 'Новые замеры' : 'Начальные замеры'} onClose={onClose}>
      <div className="form">
        <p className="small muted">{last ? 'Подставлены прошлые значения, поправьте изменившиеся.' : 'Первые замеры станут точкой отсчёта: дальше будем показывать разницу с ними.'}</p>
        <div className="field-row">
          {MEASURE_FIELDS.map((f) => (
            <label key={f.key} className="field">
              <span className="field__label">
                {f.label}, {f.unit}
              </span>
              <input
                className="field__input"
                inputMode="decimal"
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={last?.[f.key] !== undefined ? String(last[f.key]) : '—'}
              />
            </label>
          ))}
        </div>
        <label className="field">
          <span className="field__label">Дата</span>
          <input className="field__input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Заметка</span>
          <input className="field__input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: после отпуска" />
        </label>
        <button className="btn" disabled={!filled} onClick={submit}>
          Сохранить замеры
        </button>
      </div>
    </Sheet>
  )
}
