import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { DeviceFrame, shouldUseFrame } from './dev/DeviceFrame'
import './styles/global.css'

// Адрес без решётки (/admin) переводим в маршрут приложения (/#/admin)
if (location.pathname !== '/' && !location.hash) {
  history.replaceState(null, '', `/#${location.pathname}`)
}

const isAdminRoute = () => location.hash.startsWith('#/admin')

/**
 * На десктопе мобильное приложение открывается внутри мокапа iPhone,
 * админка — на весь экран. На телефоне или с ?frame=0 рамки нет.
 */
function Root() {
  const [admin, setAdmin] = useState(isAdminRoute)
  useEffect(() => {
    const on = () => setAdmin(isAdminRoute())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  if (admin || !shouldUseFrame()) return <App />
  return (
    <DeviceFrame>
      <App />
    </DeviceFrame>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
