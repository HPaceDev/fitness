import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { AppState, Client, Payment, Workout, WorkoutStatus } from './types'
import { createSeed } from './seed'
import { uid } from '../utils/id'

const STORAGE_KEY = 'fittrainer.state.v1'

type Action =
  | { type: 'client/add'; client: Omit<Client, 'id' | 'createdAt'> }
  | { type: 'client/update'; id: string; patch: Partial<Omit<Client, 'id'>> }
  | { type: 'client/remove'; id: string }
  | { type: 'payment/add'; payment: Omit<Payment, 'id'> }
  | { type: 'payment/remove'; id: string }
  | { type: 'workout/add'; workout: Omit<Workout, 'id'> }
  | { type: 'workout/setStatus'; id: string; status: WorkoutStatus }
  | { type: 'workout/update'; id: string; patch: Partial<Omit<Workout, 'id'>> }
  | { type: 'workout/remove'; id: string }
  | { type: 'reset' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'client/add':
      return {
        ...state,
        clients: [...state.clients, { ...action.client, id: uid('c'), createdAt: new Date().toISOString() }],
      }
    case 'client/update':
      return { ...state, clients: state.clients.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) }
    case 'client/remove':
      return {
        clients: state.clients.filter((c) => c.id !== action.id),
        payments: state.payments.filter((p) => p.clientId !== action.id),
        workouts: state.workouts.filter((w) => w.clientId !== action.id),
      }
    case 'payment/add':
      return { ...state, payments: [...state.payments, { ...action.payment, id: uid('p') }] }
    case 'payment/remove':
      return { ...state, payments: state.payments.filter((p) => p.id !== action.id) }
    case 'workout/add':
      return { ...state, workouts: [...state.workouts, { ...action.workout, id: uid('w') }] }
    case 'workout/setStatus':
      return {
        ...state,
        workouts: state.workouts.map((w) => (w.id === action.id ? { ...w, status: action.status } : w)),
      }
    case 'workout/update':
      return { ...state, workouts: state.workouts.map((w) => (w.id === action.id ? { ...w, ...action.patch } : w)) }
    case 'workout/remove':
      return { ...state, workouts: state.workouts.filter((w) => w.id !== action.id) }
    case 'reset':
      return createSeed()
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && Array.isArray(parsed.clients)) return parsed
    }
  } catch {
    /* ignore */
  }
  return createSeed()
}

interface StoreValue {
  state: AppState
  dispatch: (a: Action) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
