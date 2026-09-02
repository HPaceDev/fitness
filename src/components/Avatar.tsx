const COLORS = ['#ff5a1f', '#007aff', '#34c759', '#af52de', '#ff9500', '#5856d6', '#00c7be', '#ff2d55']

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function Avatar({ name, id, size }: { name: string; id: string; size?: 'lg' }) {
  const color = COLORS[hash(id) % COLORS.length]
  return (
    <span className={`avatar${size === 'lg' ? ' avatar--lg' : ''}`} style={{ background: color }}>
      {initials(name)}
    </span>
  )
}
