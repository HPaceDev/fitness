import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './data/store'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { TabBar } from './components/TabBar'
import { LoginScreen } from './screens/auth/LoginScreen'
import { RegisterScreen } from './screens/auth/RegisterScreen'
import { ScheduleScreen } from './screens/trainer/ScheduleScreen'
import { ClientsScreen } from './screens/trainer/ClientsScreen'
import { ClientScreen } from './screens/trainer/ClientScreen'
import { GroupScreen } from './screens/trainer/GroupScreen'
import { FinanceScreen } from './screens/trainer/FinanceScreen'
import { HomeScreen } from './screens/client/HomeScreen'
import { SubscriptionScreen } from './screens/client/SubscriptionScreen'
import { ProfileScreen } from './screens/client/ProfileScreen'

function Shell() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="app">
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    )
  }

  if (user.role === 'trainer') {
    return (
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
    )
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/me" element={<HomeScreen />} />
        <Route path="/me/subscription" element={<SubscriptionScreen />} />
        <Route path="/me/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/me" replace />} />
      </Routes>
      <TabBar role="client" />
    </div>
  )
}

export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </HashRouter>
    </StoreProvider>
  )
}
