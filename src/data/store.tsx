import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { AppState, Attendance, Client, Group, Payment, User, Workout, WorkoutStatus } from './types'
import { createSeed } from './seed'

const STORAGE_KEY = 'fittrainer.state.v2'

export type Action =
  | { type: 'user/add'; user: User }
  | { type: 'client/add'; client: Client }
  | { type: 'client/update'; id: string; patch: Partial<Omit<Client, 'id'>> }
  | { type: 'client/remove'; id: string }
  | { type: 'group/add'; group: Group }
  | { type: 'group/update'; id: string; patch: Partial<Omit<Group, 'id'>> }
  | { type: 'group/remove'; id: string }
  | { type: 'group/addMember'; id: string; clientId: string }
  | { type: 'group/removeMember'; id: string; clientId: string }
  | { type: 'payment/add'; payment: Payment }
  | { type: 'payment/confirm'; id: string }
  | { type: 'payment/remove'; id: string }
  | { type: 'workout/add'; workout: Workout }
  | { type: 'workout/setStatus'; id: string; status: WorkoutStatus }
  | { type: 'workout/setAttendance'; id: string; clientId: string; value: Attendance }
  | { type: 'workout/update'; id: string; patch: Partial<Omit<Workout, 'id'>> }
  | { type: 'workout/remove'; id: string }
  | { type: 'reset' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'user/add':
      return { ...state, users: [...state.users, action.user] }
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
    case 'payment/confirm':
      return { ...state, payments: state.payments.map((p) => (p.id === action.id ? { ...p, status: 'confirmed' } : p)) }
    case 'payment/remove':
      return { ...state, payments: state.payments.filter((p) => p.id !== action.id) }
    case 'workout/add':
      return { ...state, workouts: [...state.workouts, action.workout] }
    case 'workout/setStatus':
      return {
        ...state,
        workouts: state.workouts.map((w) => {
          if (w.id !== action.id) return w
          // При отметке групповой «проведена» считаем всех участников присутствовавшими
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
    case 'reset':
      return createSeed()
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && Array.isArray(parsed.clients) && Array.isArray(parsed.users) && Array.isArray(parsed.groups)) return parsed
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
