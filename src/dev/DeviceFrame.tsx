import { useEffect, useState, type ReactNode } from 'react'
import './DeviceFrame.css'

/**
 * Мокап iPhone для разработки. Оборачивает приложение, когда мы открыты на десктопе.
 * На реальном телефоне (узкий вьюпорт) или при ?frame=0 приложение рендерится как есть.
 */
export function shouldUseFrame(): boolean {
  if (typeof window === 'undefined') return false
  const q = new URLSearchParams(window.location.search).get('frame')
  if (q === '0' || q === 'false') return false
  if (q === '1' || q === 'true') return true
  // На узких экранах (телефон) мокап не нужен
  return window.innerWidth >= 600
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function DeviceFrame({ children }: { children: ReactNode }) {
  const now = useClock()
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div className="dev-stage">
      <div className="dev-stage__aside">
        <b>FitTrainer</b> · dev preview
        <br />
        Мокап iPhone 15 (393 × 852)
        <br />
        Без рамки: <a href="?frame=0">?frame=0</a>
        <br />
        Сброс данных: <code>localStorage.clear()</code>
      </div>
      <div className="iphone">
        <div className="iphone__screen">
          <div className="iphone__island" />
          <div className="iphone__status">
            <span>{time}</span>
            <span className="iphone__status-right">
              <SignalIcon />
              <WifiIcon />
              <BatteryIcon />
            </span>
          </div>
          {children}
          <div className="iphone__home" />
        </div>
      </div>
    </div>
  )
}

function SignalIcon() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
      <rect x="0" y="8" width="3" height="4" rx="0.8" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
      <rect x="10" y="3" width="3" height="9" rx="0.8" />
      <rect x="15" y="0" width="3" height="12" rx="0.8" />
    </svg>
  )
}
function WifiIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
      <path d="M8 9.5a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Zm0-3.3c1.5 0 2.9.6 3.9 1.6l-1.3 1.3A3.7 3.7 0 0 0 8 8.2c-1 0-2 .4-2.6.9L4.1 7.8A5.5 5.5 0 0 1 8 6.2Zm0-3.2c2.4 0 4.6 1 6.2 2.5L13 6.8A7.2 7.2 0 0 0 8 4.8c-2 0-3.7.8-5 2L1.8 5.5A9 9 0 0 1 8 3Z" />
    </svg>
  )
}
function BatteryIcon() {
  return (
    <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
      <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" opacity="0.4" />
      <rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" />
      <path d="M25 4.5v4a2 2 0 0 0 0-4Z" fill="currentColor" opacity="0.4" />
    </svg>
  )
}
