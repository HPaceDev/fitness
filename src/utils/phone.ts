/** Оставляет только цифры, «8» в начале заменяет на «7» */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1)
  return d
}

export function formatPhone(raw?: string): string {
  if (!raw) return ''
  const d = normalizePhone(raw)
  if (d.length === 11) return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`
  return raw
}
