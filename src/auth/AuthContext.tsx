import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Role, User } from '../data/types'
import { api, ApiError, getToken, setToken } from '../api/client'

export interface RegisterInput {
  role: Role
  name: string
  phone: string
  password: string
  /** Токен ссылки-приглашения от тренера */
  invite?: string
}

type Result = { ok: true } | { ok: false; error: string }

interface AuthValue {
  user: User | null
  /** true, пока проверяем сохранённый токен */
  loading: boolean
  login: (phone: string, password: string, invite?: string) => Promise<Result>
  register: (input: RegisterInput) => Promise<Result>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'Что-то пошло не так')

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(() => !!getToken())

  useEffect(() => {
    if (!getToken()) return
    api<{ user: User }>('/api/me')
      .then((r) => setUser(r.user))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status !== 0) setToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback<AuthValue['login']>(async (phone, password, invite) => {
    try {
      const r = await api<{ token: string; user: User }>('/api/auth/login', { body: { phone, password, invite } })
      setToken(r.token)
      setUser(r.user)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errText(e) }
    }
  }, [])

  const register = useCallback<AuthValue['register']>(async (input) => {
    try {
      const r = await api<{ token: string; user: User }>('/api/auth/register', { body: input })
      setToken(r.token)
      setUser(r.user)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: errText(e) }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST', body: {} })
    } catch {
      /* токен всё равно забываем */
    }
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
