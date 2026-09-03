import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './data/store'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { TabBar } from './components/TabBar'
import { LoginScreen } from './screens/auth/LoginScreen'
import { RegisterScreen } from './screens/auth/RegisterScreen'
import { JoinScreen } from './screens/auth/JoinScreen'
import { WelcomeScreen, isOnboarded } from './screens/auth/WelcomeScreen'
import { ScheduleScreen } from './screens/trainer/ScheduleScreen'
import { ClientsScreen } from './screens/trainer/ClientsScreen'
import { ClientScreen } from './screens/trainer/ClientScreen'
import { GroupScreen } from './screens/trainer/GroupScreen'
import { FinanceScreen } from './screens/trainer/FinanceScreen'
import { HomeScreen } from './screens/client/HomeScreen'
import { SubscriptionScreen } from './screens/client/SubscriptionScreen'
import { ProfileScreen } from './screens/client/ProfileScreen'
import { AdminApp } from './screens/admin/AdminApp'

/** Скелет вместо крутилки: форма совпадает с тем, что появится */
function Splash() {
  return (
    <div className="app">
      <div className="app__content">
        <div className="skel skel--head" />
        <div className="skel skel--line" style={{ width: '40%', marginBottom: 22 }} />
        <div className="skel skel--row" />
        <div className="skel skel--row" />
        <div className="skel skel--row" />
      </div>
    </div>
  )
}

/** Ждём первое состояние с сервера, потом рисуем кабинет */
function Loaded({ children }: { children: React.ReactNode }) {
  const { loading } = useStore()
  if (loading) return <Splash />
  return <>{children}</>
}

function Shell() {
  const { user, loading } = useAuth()

  if (loading) return <Splash />

  if (!user) {
    return (
      <div className="app">
        <Routes>
          <Route path="/welcome" element={<WelcomeScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/join/:token" element={<JoinScreen />} />
          <Route path="*" element={<Navigate to={isOnboarded() ? '/login' : '/welcome'} replace />} />
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
