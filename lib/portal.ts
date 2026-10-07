import type { Show } from './shows'

export type PortalProjection = {
  tickets: number | null
  low: number | null
  high: number | null
  revenue: number | null
  confidence: string | null
  paceLabel: string | null
  computedAt: string | null
}

export type PortalMatch = {
  eventId: string
  hasEvent: boolean
  confirmed: number | null
  ticketsAvailable: number | null
  revenue: number | null
  projection: PortalProjection | null
}

export type PortalMap = Record<string, PortalMatch>

export type PortalSuggestion = { eventId: string; venue: string }

export function portalFor(show: Show, portal: PortalMap | undefined): PortalMatch | undefined {
  const id = show.portalEventId.trim()
  return id ? portal?.[id] : undefined
}

export const isPastShow = (show: Show, todayISO: string) => show.date < todayISO

export function soldLabel(m: PortalMatch) {
  return `${m.confirmed ?? 0}/${m.ticketsAvailable ?? '—'} sold`
}

export function sellThrough(m: PortalMatch): number | null {
  if (!m.hasEvent || m.confirmed == null || !m.ticketsAvailable) return null
  return m.confirmed / m.ticketsAvailable
}

export function rangeLabel(p: PortalProjection, separator = ' to ') {
  if (p.low == null || p.high == null) return null
  return `${Math.round(p.low)}${separator}${Math.round(p.high)}`
}

export function paceTag(label: string | null | undefined): 'Behind' | 'Ahead' | null {
  if (label === 'behind') return 'Behind'
  if (label === 'ahead') return 'Ahead'
  return null
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export const isStale = (iso: string, now = Date.now()) => now - new Date(iso).getTime() > 3 * 60 * 60 * 1000

export function portalTotals(shows: Show[], portal: PortalMap | undefined, todayISO: string) {
  let actual = 0
  let projected = 0
  for (const show of shows) {
    const match = portalFor(show, portal)
    if (match?.hasEvent) actual += match.revenue ?? 0
    if (show.status === 'Cancelled') continue
    const past = isPastShow(show, todayISO)
    if (past && match?.hasEvent) projected += match.revenue ?? 0
    else if (!past && match?.projection?.revenue != null) projected += match.projection.revenue
    else projected += show.projectedRevenue ?? 0
  }
  return { actual, projected }
}
