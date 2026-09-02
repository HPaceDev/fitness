import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../data/store'
import type { Client, Role, User } from '../data/types'
import { uid } from '../utils/id'
import { normalizePhone } from '../utils/phone'

/**
 * Авторизация прототипа. Пользователи лежат в общем локальном состоянии,
 * сессия — в отдельном ключе localStorage. Интерфейс (login / register / logout)
 * повторяет то, что будет у настоящего API, чтобы экраны потом не переписывать.
 */

const SESSION_KEY = 'fittrainer.session.v1'

export interface RegisterInput {
  role: Role
  name: string
  phone: string
  password: string
}

interface AuthValue {
  user: User | null
  login: (phone: string, password: string) => { ok: true } | { ok: false; error: string }
  register: (input: RegisterInput) => { ok: true } | { ok: false; error: string }
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function writeSession(userId: string | null) {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore()
  const [userId, setUserId] = useState<string | null>(readSession)

  const user = useMemo(() => state.users.find((u) => u.id === userId) ?? null, [state.users, userId])

  const login = useCallback<AuthValue['login']>(
    (phone, password) => {
      const p = normalizePhone(phone)
      const found = state.users.find((u) => u.phone === p)
      if (!found) return { ok: false, error: 'Пользователь с таким телефоном не найден' }
      if (found.password !== password) return { ok: false, error: 'Неверный пароль' }
      writeSession(found.id)
      setUserId(found.id)
      return { ok: true }
    },
    [state.users],
  )

  const register = useCallback<AuthValue['register']>(
    ({ role, name, phone, password }) => {
      const p = normalizePhone(phone)
      if (name.trim().length < 2) return { ok: false, error: 'Введите имя' }
      if (p.length < 10) return { ok: false, error: 'Введите телефон полностью' }
      if (password.length < 4) return { ok: false, error: 'Пароль не короче 4 символов' }
      if (state.users.some((u) => u.phone === p)) return { ok: false, error: 'Этот телефон уже зарегистрирован' }

      const now = new Date().toISOString()
      const newUser: User = { id: uid('u'), role, name: name.trim(), phone: p, password, createdAt: now }
      dispatch({ type: 'user/add', user: newUser })

      if (role === 'client') {
        // Если тренер уже завёл подопечного с этим телефоном — связываем, иначе создаём карточку
        const existing = state.clients.find((c) => c.phone && normalizePhone(c.phone) === p && !c.userId)
        if (existing) {
          dispatch({ type: 'client/update', id: existing.id, patch: { userId: newUser.id } })
        } else {
          const client: Client = { id: uid('c'), name: newUser.name, phone: p, pricePerSession: 3000, createdAt: now, userId: newUser.id }
          dispatch({ type: 'client/add', client })
        }
      }

      writeSession(newUser.id)
      setUserId(newUser.id)
      return { ok: true }
    },
    [state.users, state.clients, dispatch],
  )

  const logout = useCallback(() => {
    writeSession(null)
    setUserId(null)
  }, [])

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
