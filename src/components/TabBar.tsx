import { NavLink } from 'react-router-dom'
import type { Role } from '../data/types'
import { CalendarBlank, Ticket, User, UsersThree, Wallet } from './icons'

const TRAINER_TABS = [
  { to: '/', label: 'Расписание', Icon: CalendarBlank },
  { to: '/clients', label: 'Подопечные', Icon: UsersThree },
  { to: '/finance', label: 'Финансы', Icon: Wallet },
]
const CLIENT_TABS = [
  { to: '/me', label: 'Расписание', Icon: CalendarBlank },
  { to: '/me/subscription', label: 'Мои тренировки', Icon: Ticket },
  { to: '/me/profile', label: 'Профиль', Icon: User },
]

export function TabBar({ role }: { role: Role }) {
  const tabs = role === 'trainer' ? TRAINER_TABS : CLIENT_TABS
  return (
    <nav className="tabbar">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/' || to === '/me'} className={({ isActive }) => `tab${isActive ? ' tab--active' : ''}`}>
          <Icon size={22} weight="regular" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
