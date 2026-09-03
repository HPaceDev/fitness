import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { formatEntry, knownExercises, lastEntryFor } from '../data/selectors'
import { Sheet } from './Sheet'
import { formatDateShort, parseLocal, toLocalInput } from '../utils/date'
import { uid } from '../utils/id'
import { Check } from './icons'
import { catalogNames } from '../data/exercises'

interface Props {
  open: boolean
  onClose: () => void
  clientId: string
  /** Тренировка, к которой относится запись */
  workoutId?: string
  defaultDate?: string
}

/**
 * Запись прогресса: тренер печатает упражнение, приложение подсказывает из её
 * прошлых записей и показывает «в прошлый раз». Несколько записей подряд без закрытия.
 */
export function ExerciseSheet({ open, onClose, clientId, workoutId, defaultDate }: Props) {
  const { state, dispatch } = useStore()
  const [exercise, setExercise] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [sets, setSets] = useState('3')
  const [date, setDate] = useState(defaultDate ?? toLocalInput(new Date()).slice(0, 10))
  const [saved, setSaved] = useState<string[]>([])

  const suggestions = useMemo(() => {
    const own = knownExercises(state)
    return [...own, ...catalogNames(own)]
  }, [state])
  const last = useMemo(() => (exercise.trim() ? lastEntryFor(state, clientId, exercise) : undefined), [state, clientId, exercise])

  const valid = exercise.trim().length > 0 && (weight !== '' || reps !== '')

  const submit = () => {
    if (!valid) return
    const name = exercise.trim()
    dispatch({
      type: 'exercise/add',
      entry: {
        id: uid(),
        clientId,
        workoutId,
        date,
        exercise: name,
        weightKg: weight !== '' ? Number(weight.replace(',', '.')) : undefined,
        reps: reps !== '' ? Number(reps) : undefined,
        sets: sets !== '' ? Number(sets) : undefined,
      },
    })
    setSaved((s) => [`${name}: ${[weight && `${weight} кг`, reps && `× ${reps}`].filter(Boolean).join(' ')}`, ...s])
    setExercise('')
    setWeight('')
    setReps('')
  }

  return (
    <Sheet open={open} title="Записать прогресс" onClose={onClose}>
      <div className="form">
        {saved.length > 0 && (
          <div className="card small" style={{ background: 'var(--green-soft)', color: 'var(--green-text)' }}>
            {saved.map((s, i) => (
              <div key={i} className="flex" style={{ gap: 6 }}>
                <Check size={14} weight="bold" />
                {s}
              </div>
            ))}
          </div>
        )}
        <label className="field">
          <span className="field__label">Упражнение</span>
          <input
            className="field__input"
            list="exercise-suggestions"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            placeholder="Присед со штангой"
            autoFocus
            autoComplete="off"
          />
          <datalist id="exercise-suggestions">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          {last ? (
            <span className="field__hint" style={{ color: 'var(--text)' }}>
              В прошлый раз ({formatDateShort(parseLocal(last.date))}): <b>{formatEntry(last)}</b>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ minHeight: 24, padding: '0 6px' }}
                onClick={() => {
                  if (last.weightKg !== undefined) setWeight(String(last.weightKg))
                  if (last.reps) setReps(String(last.reps))
                  if (last.sets) setSets(String(last.sets))
                }}
              >
                подставить
              </button>
            </span>
          ) : exercise.trim() ? (
            <span className="field__hint">Первая запись по этому упражнению</span>
          ) : null}
        </label>
        <div className="field-row">
          <label className="field">
            <span className="field__label">Вес, кг</span>
            <input className="field__input" value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" placeholder="40" />
          </label>
          <label className="field">
            <span className="field__label">Повторов</span>
            <input className="field__input" value={reps} onChange={(e) => setReps(e.target.value)} inputMode="numeric" placeholder="10" />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span className="field__label">Подходов</span>
            <input className="field__input" value={sets} onChange={(e) => setSets(e.target.value)} inputMode="numeric" />
          </label>
          <label className="field">
            <span className="field__label">Дата</span>
            <input className="field__input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <button className="btn" disabled={!valid} onClick={submit}>
          Записать и добавить ещё
        </button>
        <button className="btn btn--secondary" onClick={onClose}>
          Готово
        </button>
      </div>
    </Sheet>
  )
}
