import { HashRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './data/store'
import { TabBar } from './components/TabBar'
import { ScheduleScreen } from './screens/ScheduleScreen'
import { ClientsScreen } from './screens/ClientsScreen'
import { ClientScreen } from './screens/ClientScreen'
import { FinanceScreen } from './screens/FinanceScreen'

export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<ScheduleScreen />} />
            <Route path="/clients" element={<ClientsScreen />} />
            <Route path="/clients/:id" element={<ClientScreen />} />
            <Route path="/finance" element={<FinanceScreen />} />
          </Routes>
          <TabBar />
        </div>
      </HashRouter>
    </StoreProvider>
  )
}
