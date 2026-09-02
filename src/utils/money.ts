export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '−' : ''
  const abs = Math.abs(Math.round(amount))
  return `${sign}${abs.toLocaleString('ru-RU')} ₽`
}
