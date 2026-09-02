import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { DeviceFrame, shouldUseFrame } from './dev/DeviceFrame'
import './styles/global.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

// В dev на десктопе приложение открывается внутри мокапа iPhone.
// На телефоне или с ?frame=0 — как обычное полноэкранное приложение.
const useFrame = import.meta.env.DEV ? shouldUseFrame() : new URLSearchParams(location.search).get('frame') === '1'

root.render(
  <React.StrictMode>{useFrame ? <DeviceFrame><App /></DeviceFrame> : <App />}</React.StrictMode>,
)
