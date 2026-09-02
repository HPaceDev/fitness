import { useEffect, useState } from 'react'
import { useStore } from '../../data/store'
import { clientById } from '../../data/selectors'
import { Sheet } from '../../components/Sheet'

/** Ссылка-приглашение: подопечный открывает, регистрируется в один шаг и сразу привязан к карточке */
export function InviteSheet({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const { state, dispatch } = useStore()
  const client = clientById(state, clientId)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open && client && !client.inviteToken) dispatch({ type: 'client/invite', id: clientId })
  }, [open, client, clientId, dispatch])

  if (!client) return null
  const url = client.inviteToken ? `${location.origin}/#/join/${client.inviteToken}` : null
  const text = url ? `${client.name.split(' ')[0]}, привет! Я веду наши тренировки и оплаты в приложении. Зарегистрируйся по ссылке, там будет расписание и остаток занятий: ${url}` : ''

  const share = async () => {
    if (!url) return
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        /* отменили */
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      /* нет доступа к буферу */
    }
  }

  return (
    <Sheet open={open} title="Пригласить в приложение" onClose={onClose}>
      <div className="form">
        <p className="small muted">
          Отправьте ссылку {client.name.split(' ')[0]} в любом мессенджере. По ней откроется регистрация с уже заполненными именем и телефоном, а аккаунт сразу привяжется к этой карточке.
        </p>
        <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none', wordBreak: 'break-all', fontSize: 14 }}>
          {url ?? 'Создаём ссылку…'}
        </div>
        <button className="btn" disabled={!url} onClick={share}>
          {copied ? 'Скопировано' : 'Отправить или скопировать'}
        </button>
      </div>
    </Sheet>
  )
}
