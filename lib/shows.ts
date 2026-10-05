export const CATEGORIES = ['Core', 'Premium', 'Special'] as const
export type Category = (typeof CATEGORIES)[number]

export const STATUSES = ['Idea', 'Tentative', 'Confirmed', 'Cancelled'] as const
export type Status = (typeof STATUSES)[number]

export const REGIONS = ['LA', 'Long Beach', 'Orange County'] as const
export type Region = (typeof REGIONS)[number]

export const ORGANIZERS = ['Sofar', 'Local Producer'] as const
export type Organizer = (typeof ORGANIZERS)[number]

export const FORMATS: Record<Category, readonly string[]> = {
  Core: [
    'Discovery',
    'Discovery: Hip Hop R&B',
    'Discovery: Jazz Night',
    'Discovery: Storytellers',
    'Discovery: Backyard',
    'Discovery: Rooftop',
    'Artist Headline',
    'Singles Night',
  ],
  Premium: [
    'Songwriter Session',
    'Candlelight Session',
    'Paint & Sip',
    'Pottery Session',
    'Sound Bath',
    'Sunset Boat Show',
  ],
  Special: [
    'Sofar Festival / Kickoff',
    'College / Campus',
    'Brand Partnership',
    'Private / Corporate',
    'Holiday / Special Occasion',
  ],
}

export const DEFAULT_TICKET_PRICES: Record<string, number> = {
  'Sunset Boat Show': 45,
  'Candlelight Session': 55,
  'Paint & Sip': 80,
  'Pottery Session': 100,
}

export type Show = {
  id: string
  date: string
  category: Category
  format: string
  area: string
  venue: string
  tickets: number | null
  ticketPrice: number | null
  projectedRevenue: number | null
  status: Status
  region: Region
  organizedBy: Organizer
  portalEventId: string
  notes: string
}

export type ShowInput = Omit<Show, 'id'> & { id?: string }

export type MonthData = {
  shows: Show[]
  target: number | null
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function cleanText(value: unknown, max: number): string {
  if (value == null) return ''
  if (typeof value !== 'string') throw new Error('Invalid text value')
  return value.trim().slice(0, max)
}

function cleanNumber(value: unknown, { integer = false, max = 10_000_000 } = {}): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error('Numbers must be zero or more')
  if (integer && !Number.isInteger(n)) throw new Error('Tickets must be a whole number')
  return integer ? n : Math.round(n * 100) / 100
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function validateShowInput(raw: unknown): ShowInput {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid show')
  const r = raw as Record<string, unknown>

  const date = typeof r.date === 'string' && DATE_RE.test(r.date) ? r.date : null
  if (!date || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) throw new Error('A valid date is required')

  const category = r.category as Category
  if (!CATEGORIES.includes(category)) throw new Error('Pick a category')

  const format = typeof r.format === 'string' ? r.format : ''
  if (!FORMATS[category].includes(format)) throw new Error('Pick a format for this category')

  const status = r.status as Status
  if (!STATUSES.includes(status)) throw new Error('Pick a status')

  const region = (r.region as Region) ?? 'LA'
  if (!REGIONS.includes(region)) throw new Error('Pick a region')

  const organizedBy = (r.organizedBy as Organizer) ?? 'Sofar'
  if (!ORGANIZERS.includes(organizedBy)) throw new Error('Pick who organized this show')

  return {
    id: r.id === undefined ? undefined : isUuid(r.id) ? r.id : (() => { throw new Error('Invalid id') })(),
    date,
    category,
    format,
    status,
    region,
    organizedBy,
    area: cleanText(r.area, 120),
    venue: cleanText(r.venue, 160),
    tickets: cleanNumber(r.tickets, { integer: true, max: 100_000 }),
    ticketPrice: cleanNumber(r.ticketPrice, { max: 100_000 }),
    projectedRevenue: cleanNumber(r.projectedRevenue),
    portalEventId: cleanText(r.portalEventId, 120),
    notes: cleanText(r.notes, 4000),
  }
}

export function summarize(shows: Show[], target: number | null) {
  const active = shows.filter((s) => s.status !== 'Cancelled')
  const planned = active.reduce((sum, s) => sum + (s.projectedRevenue ?? 0), 0)
  const confirmed = active
    .filter((s) => s.status === 'Confirmed')
    .reduce((sum, s) => sum + (s.projectedRevenue ?? 0), 0)
  return {
    planned,
    confirmed,
    count: active.length,
    average: active.length ? planned / active.length : null,
    variance: target == null ? null : planned - target,
  }
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatCurrency(n: number) {
  return currency.format(n)
}

export function formatCompact(n: number) {
  if (n >= 1000) return `$${Math.round(n / 100) / 10}k`
  return `$${Math.round(n)}`
}
