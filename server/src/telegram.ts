import { eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import type { Db } from './db/index.js'
import { schema } from './db/index.js'

/**
 * Telegram-бот для уведомлений. Работает только если задан TELEGRAM_BOT_TOKEN.
 * Привязка: пользователь получает ссылку t.me/<bot>?start=<код>, бот по /start <код>
 * запоминает chat_id. Обновления забираем long polling — публичный адрес не нужен.
 */

const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
const API = token ? `https://api.telegram.org/bot${token}` : null

export const telegramEnabled = !!API
let botUsername: string | null = null
export const getBotUsername = () => botUsername

async function call<T>(method: string, body?: unknown): Promise<T | null> {
  if (!API) return null
  try {
    const res = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(40_000),
    })
    const data = (await res.json()) as { ok: boolean; result?: T; description?: string }
    if (!data.ok) {
      console.warn('telegram', method, data.description)
      return null
    }
    return data.result ?? null
  } catch (e) {
    console.warn('telegram', method, (e as Error).message)
    return null
  }
}

export async function sendMessage(chatId: string, text: string): Promise<boolean> {
  const r = await call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
  return r !== null
}

/** Код привязки для пользователя и ссылка на бота */
export async function makeLinkCode(db: Db, userId: string): Promise<{ code: string; url: string | null }> {
  const code = randomBytes(8).toString('base64url')
  await db.update(schema.users).set({ telegramLinkCode: code }).where(eq(schema.users.id, userId))
  return { code, url: botUsername ? `https://t.me/${botUsername}?start=${code}` : null }
}

export async function unlink(db: Db, userId: string) {
  await db.update(schema.users).set({ telegramChatId: null, telegramLinkCode: null }).where(eq(schema.users.id, userId))
}

interface Update {
  update_id: number
  message?: { chat: { id: number }; text?: string; from?: { first_name?: string } }
}

async function handle(db: Db, u: Update) {
  const msg = u.message
  if (!msg?.text) return
  const chatId = String(msg.chat.id)
  const m = /^\/start\s+(\S+)/.exec(msg.text)
  if (m) {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.telegramLinkCode, m[1]!))
    if (!user) {
      await sendMessage(chatId, 'Код не подошёл. Откройте приложение FitTrainer, раздел «Профиль», и нажмите «Подключить Telegram» ещё раз.')
      return
    }
    await db.update(schema.users).set({ telegramChatId: chatId, telegramLinkCode: null }).where(eq(schema.users.id, user.id))
    await sendMessage(
      chatId,
      `Готово, ${user.name.split(' ')[0]}! Сюда будут приходить ${
        user.role === 'trainer' ? 'напоминания о тренировках на завтра, днях рождения подопечных и заканчивающихся абонементах' : 'напоминания о тренировках и остатке занятий'
      }.`,
    )
    return
  }
  if (msg.text.startsWith('/start')) {
    await sendMessage(chatId, 'Чтобы подключить уведомления, откройте приложение FitTrainer → «Профиль» → «Подключить Telegram» и перейдите по ссылке оттуда.')
    return
  }
  await sendMessage(chatId, 'Это бот уведомлений FitTrainer. Он только присылает напоминания, отвечать ему не нужно.')
}

/** Запуск long polling. Возвращается сразу, цикл живёт в фоне. */
export async function startTelegram(db: Db) {
  if (!API) return
  const me = await call<{ username: string }>('getMe')
  if (!me) {
    console.warn('Telegram: токен не принят, уведомления выключены')
    return
  }
  botUsername = me.username
  console.log(`Telegram-бот @${botUsername} подключён`)
  let offset = 0
  const loop = async () => {
    for (;;) {
      const updates = await call<Update[]>('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] })
      if (!updates) {
        await new Promise((r) => setTimeout(r, 5000))
        continue
      }
      for (const u of updates) {
        offset = u.update_id + 1
        try {
          await handle(db, u)
        } catch (e) {
          console.warn('telegram handle', (e as Error).message)
        }
      }
    }
  }
  void loop()
}
