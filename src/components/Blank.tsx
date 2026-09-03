import type { ReactNode } from 'react'

/** Пустое состояние: что здесь будет и как это заполнить */
export function Blank({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="blank">
      <span className="blank__icon">{icon}</span>
      <span className="blank__title">{title}</span>
      <span className="blank__text">{text}</span>
      {action}
    </div>
  )
}
