import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppState, Attendance, Client, Group, Payment, Workout, WorkoutStatus } from './types'
import { api, ApiError } from '../api/client'

/**
 * Состояние кабинета живёт на сервере. Здесь — его копия:
 * действие применяется локально сразу (интерфейс не ждёт сеть),
 * параллельно уходит на сервер, а ответ сервера становится истиной.
 */

export type Action =
  | { type: 'client/add'; client: Client }
  | { type: 'client/update'; id: string; patch: Partial<Omit<Client, 'id'>> }
  | { type: 'client/remove'; id: string }
  | { type: 'group/add'; group: Group }
  | { type: 'group/update'; id: string; patch: Partial<Omit<Group, 'id'>> }
  | { type: 'group/remove'; id: string }
  | { type: 'group/addMember'; id: string; clientId: string }
  | { type: 'group/removeMember'; id: string; clientId: string }
  | { type: 'payment/add'; payment: Payment }
  | { type: 'payment/remove'; id: string }
  | { type: 'workout/add'; workout: Workout }
  | { type: 'workout/setStatus'; id: string; status: WorkoutStatus }
  | { type: 'workout/setAttendance'; id: string; clientId: string; value: Attendance }
  | { type: 'workout/update'; id: string; patch: Partial<Omit<Workout, 'id'>> }
  | { type: 'workout/remove'; id: string }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'client/add':
      return { ...state, clients: [...state.clients, action.client] }
    case 'client/update':
      return { ...state, clients: state.clients.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) }
    case 'client/remove':
      return {
        ...state,
        clients: state.clients.filter((c) => c.id !== action.id),
        groups: state.groups.map((g) => ({ ...g, memberIds: g.memberIds.filter((m) => m !== action.id) })),
        payments: state.payments.filter((p) => p.clientId !== action.id),
        workouts: state.workouts.filter((w) => w.clientId !== action.id),
      }
    case 'group/add':
      return { ...state, groups: [...state.groups, action.group] }
    case 'group/update':
      return { ...state, groups: state.groups.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)) }
    case 'group/remove':
      return {
        ...state,
        groups: state.groups.filter((g) => g.id !== action.id),
        payments: state.payments.filter((p) => p.groupId !== action.id),
        workouts: state.workouts.filter((w) => w.groupId !== action.id),
      }
    case 'group/addMember':
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.id && !g.memberIds.includes(action.clientId) ? { ...g, memberIds: [...g.memberIds, action.clientId] } : g,
        ),
      }
    case 'group/removeMember':
      return {
        ...state,
        groups: state.groups.map((g) => (g.id === action.id ? { ...g, memberIds: g.memberIds.filter((m) => m !== action.clientId) } : g)),
      }
    case 'payment/add':
      return { ...state, payments: [...state.payments, action.payment] }
    case 'payment/remove':
      return { ...state, payments: state.payments.filter((p) => p.id !== action.id) }
    case 'workout/add':
      return { ...state, workouts: [...state.workouts, action.workout] }
    case 'workout/setStatus':
      return {
        ...state,
        workouts: state.workouts.map((w) => {
          if (w.id !== action.id) return w
          if (w.groupId && action.status === 'done' && !w.attendance) {
            const group = state.groups.find((g) => g.id === w.groupId)
            const attendance: Record<string, Attendance> = {}
            for (const m of group?.memberIds ?? []) attendance[m] = 'present'
            return { ...w, status: action.status, attendance }
          }
          if (action.status === 'planned') return { ...w, status: action.status, attendance: undefined }
          return { ...w, status: action.status }
        }),
      }
    case 'workout/setAttendance':
      return {
        ...state,
        workouts: state.workouts.map((w) =>
          w.id === action.id ? { ...w, attendance: { ...(w.attendance ?? {}), [action.clientId]: action.value } } : w,
        ),
      }
    case 'workout/update':
      return { ...state, workouts: state.workouts.map((w) => (w.id === action.id ? { ...w, ...action.patch } : w)) }
    case 'workout/remove':
      return { ...state, workouts: state.workouts.filter((w) => w.id !== action.id) }
  }
}

export const EMPTY_STATE: AppState = { clients: [], groups: [], payments: [], workouts: [] }

interface StoreValue {
  state: AppState
  /** true, пока первое состояние ещё не загружено */
  loading: boolean
  /** Ошибка загрузки состояния (например, подопечного ещё не добавил тренер) */
  error: string | null
  dispatch: (a: Action) => void
  refresh: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Очередь: действия уходят на сервер строго по порядку
  const queue = useRef<Promise<void>>(Promise.resolve())

  const refresh = useCallback(async () => {
    try {
      const s = await api<AppState>('/api/state')
      setState(s)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const dispatch = useCallback(
    (action: Action) => {
      setState((s) => reducer(s, action))
      queue.current = queue.current
        .then(async () => {
          const s = await api<AppState>('/api/actions', { body: action })
          setState(s)
        })
        .catch(async (e) => {
          // Сервер отверг действие: откатываемся к его версии
          console.warn('action rejected', action.type, e)
          await refresh()
        })
    },
    [refresh],
  )

  const value = useMemo(() => ({ state, loading, error, dispatch, refresh }), [state, loading, error, dispatch, refresh])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
