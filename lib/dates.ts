export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(year: number, monthIndex: number, day: number) {
  const d = new Date(Date.UTC(year, monthIndex, day))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function parseMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return { year: y, monthIndex: m - 1 }
}

export function addMonths(ym: string, delta: number) {
  const { year, monthIndex } = parseMonth(ym)
  return toISO(year, monthIndex + delta, 1).slice(0, 7)
}

export function addDays(iso: string, delta: number) {
  const [year, month, day] = iso.split('-').map(Number)
  return toISO(year, month - 1, day + delta)
}

export function monthBounds(ym: string) {
  return { start: `${ym}-01`, end: `${addMonths(ym, 1)}-01` }
}

export function monthTitle(ym: string) {
  const { year, monthIndex } = parseMonth(ym)
  const month = new Date(Date.UTC(year, monthIndex, 1)).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  })
  return { month, year: String(year) }
}

export function daysInMonth(ym: string) {
  const { year, monthIndex } = parseMonth(ym)
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

export type GridDay = { iso: string; day: number; inMonth: boolean }

export function buildMonthGrid(ym: string): GridDay[] {
  const { year, monthIndex } = parseMonth(ym)
  const firstWeekday = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7
  const total = Math.ceil((firstWeekday + daysInMonth(ym)) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const iso = toISO(year, monthIndex, i - firstWeekday + 1)
    return { iso, day: Number(iso.slice(8)), inMonth: iso.startsWith(ym) }
  })
}

export function formatLongDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatShortWeekday(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  })
}
