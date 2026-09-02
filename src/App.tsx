import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './data/store'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { TabBar } from './components/TabBar'
import { LoginScreen } from './screens/auth/LoginScreen'
import { RegisterScreen } from './screens/auth/RegisterScreen'
import { JoinScreen } from './screens/auth/JoinScreen'
import { ScheduleScreen } from './screens/trainer/ScheduleScreen'
import { ClientsScreen } from './screens/trainer/ClientsScreen'
import { ClientScreen } from './screens/trainer/ClientScreen'
import { GroupScreen } from './screens/trainer/GroupScreen'
import { FinanceScreen } from './screens/trainer/FinanceScreen'
import { HomeScreen } from './screens/client/HomeScreen'
import { SubscriptionScreen } from './screens/client/SubscriptionScreen'
import { ProfileScreen } from './screens/client/ProfileScreen'
import { AdminApp } from './screens/admin/AdminApp'

function Splash({ text }: { text: string }) {
  return (
    <div className="app">
      <div className="app__content app__content--plain" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="muted">{text}</div>
      </div>
    </div>
  )
}

/** Ждём первое состояние с сервера, потом рисуем кабинет */
function Loaded({ children }: { children: React.ReactNode }) {
  const { loading } = useStore()
  if (loading) return <Splash text="Загружаем…" />
  return <>{children}</>
}

function Shell() {
  const { user, loading } = useAuth()

  if (loading) return <Splash text="Входим…" />

  if (!user) {
    return (
      <div className="app">
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/join/:token" element={<JoinScreen />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    )
  }

  if (user.role === 'admin') return <Navigate to="/admin" replace />

  if (user.role === 'trainer') {
    return (
      <StoreProvider key={user.id}>
        <Loaded>
          <div className="app">
            <Routes>
              <Route path="/" element={<ScheduleScreen />} />
              <Route path="/clients" element={<ClientsScreen />} />
              <Route path="/clients/:id" element={<ClientScreen />} />
              <Route path="/groups/:id" element={<GroupScreen />} />
              <Route path="/finance" element={<FinanceScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <TabBar role="trainer" />
          </div>
        </Loaded>
      </StoreProvider>
    )
  }

  return (
    <StoreProvider key={user.id}>
      <Loaded>
        <div className="app">
          <Routes>
            <Route path="/me" element={<HomeScreen />} />
            <Route path="/me/subscription" element={<SubscriptionScreen />} />
            <Route path="/me/profile" element={<ProfileScreen />} />
            <Route path="*" element={<Navigate to="/me" replace />} />
          </Routes>
          <TabBar role="client" />
        </div>
      </Loaded>
    </StoreProvider>
  )
}

export function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<Shell />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
