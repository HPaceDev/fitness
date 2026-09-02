import { NavLink } from 'react-router-dom'
import type { Role } from '../data/types'

const TRAINER_TABS = [
  { to: '/', label: 'Расписание', icon: CalendarIcon },
  { to: '/clients', label: 'Подопечные', icon: PeopleIcon },
  { to: '/finance', label: 'Финансы', icon: WalletIcon },
]
const CLIENT_TABS = [
  { to: '/me', label: 'Расписание', icon: CalendarIcon },
  { to: '/me/subscription', label: 'Мои тренировки', icon: TicketIcon },
  { to: '/me/profile', label: 'Профиль', icon: PersonIcon },
]

export function TabBar({ role }: { role: Role }) {
  const tabs = role === 'trainer' ? TRAINER_TABS : CLIENT_TABS
  return (
    <nav className="tabbar">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/' || to === '/me'} className={({ isActive }) => `tab${isActive ? ' tab--active' : ''}`}>
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

function CalendarIcon() {
  return (
    <svg {...svgProps}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}
function PeopleIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 20a5 5 0 0 1 6 -4" />
    </svg>
  )
}
function WalletIcon() {
  return (
    <svg {...svgProps}>
      <rect x="3" y="6" width="18" height="14" rx="3" />
      <path d="M3 10h18M16 15h2" />
    </svg>
  )
}
function TicketIcon() {
  return (
    <svg {...svgProps}>
      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6Z" />
      <path d="M13 5v14" strokeDasharray="2 3" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}
