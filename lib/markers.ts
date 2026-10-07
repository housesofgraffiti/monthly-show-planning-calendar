import { toISO } from './dates'
import { DATE_RE, isUuid } from './shows'

export const MARKER_TYPES = ['holiday', 'event'] as const
export type MarkerType = (typeof MARKER_TYPES)[number]

export type DayMarker = {
  id: string
  date: string
  label: string
  type: MarkerType
  note: string
  builtIn?: boolean
}

export type DayMarkerInput = Omit<DayMarker, 'id' | 'builtIn'> & { id?: string }

// Day of the month for the nth (1-based) given weekday (0 = Sunday) of a month.
function nthWeekday(year: number, monthIndex: number, weekday: number, n: number) {
  const first = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay()
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7
}

function lastWeekday(year: number, monthIndex: number, weekday: number) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0))
  return last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7)
}

const cache = new Map<number, DayMarker[]>()

export function builtInMarkersForYear(year: number): DayMarker[] {
  const cached = cache.get(year)
  if (cached) return cached

  const thanksgiving = nthWeekday(year, 10, 4, 4)
  const entries: [string, number, number][] = [
    ["New Year's Day", 0, 1],
    ['Martin Luther King Jr. Day', 0, nthWeekday(year, 0, 1, 3)],
    ["Valentine's Day", 1, 14],
    ["Presidents' Day", 1, nthWeekday(year, 1, 1, 3)],
    ["Mother's Day", 4, nthWeekday(year, 4, 0, 2)],
    ['Memorial Day', 4, lastWeekday(year, 4, 1)],
    ['Juneteenth', 5, 19],
    ["Father's Day", 5, nthWeekday(year, 5, 0, 3)],
    ['Independence Day', 6, 4],
    ['Labor Day', 8, nthWeekday(year, 8, 1, 1)],
    ['Columbus Day', 9, nthWeekday(year, 9, 1, 2)],
    ['Halloween', 9, 31],
    ['Veterans Day', 10, 11],
    ['Thanksgiving Eve', 10, thanksgiving - 1],
    ['Thanksgiving', 10, thanksgiving],
    ['Christmas Eve', 11, 24],
    ['Christmas Day', 11, 25],
    ["New Year's Eve", 11, 31],
  ]

  const markers = entries.map(([label, monthIndex, day]): DayMarker => {
    const date = toISO(year, monthIndex, day)
    return { id: `builtin:${date}:${label}`, date, label, type: 'holiday', note: '', builtIn: true }
  })
  cache.set(year, markers)
  return markers
}

function sortMarkers(markers: DayMarker[]) {
  return markers.sort((a, b) => a.date.localeCompare(b.date) || Number(!!b.builtIn) - Number(!!a.builtIn))
}

export function markersOn(date: string, custom: DayMarker[]): DayMarker[] {
  const year = Number(date.slice(0, 4))
  if (!Number.isFinite(year)) return []
  const builtIn = builtInMarkersForYear(year).filter((m) => m.date === date)
  return [...builtIn, ...custom.filter((m) => m.date === date)]
}

export function markersForMonth(ym: string, custom: DayMarker[]): DayMarker[] {
  const builtIn = builtInMarkersForYear(Number(ym.slice(0, 4))).filter((m) => m.date.startsWith(ym))
  return sortMarkers([...builtIn, ...custom.filter((m) => m.date.startsWith(ym))])
}

export function markersByDate(ym: string, custom: DayMarker[]): Map<string, DayMarker[]> {
  const map = new Map<string, DayMarker[]>()
  for (const marker of markersForMonth(ym, custom)) {
    map.set(marker.date, [...(map.get(marker.date) ?? []), marker])
  }
  return map
}

export function validateMarkerInput(raw: unknown): DayMarkerInput {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid marker')
  const r = raw as Record<string, unknown>

  const date = typeof r.date === 'string' && DATE_RE.test(r.date) ? r.date : null
  if (!date || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) throw new Error('A valid date is required')

  const label = typeof r.label === 'string' ? r.label.trim().slice(0, 80) : ''
  if (!label) throw new Error('Add a label')

  const type = r.type as MarkerType
  if (!MARKER_TYPES.includes(type)) throw new Error('Pick holiday or event')

  const note = typeof r.note === 'string' ? r.note.trim().slice(0, 500) : ''
  if (r.id !== undefined && !isUuid(r.id)) throw new Error('Invalid id')

  return { id: r.id as string | undefined, date, label, type, note }
}
