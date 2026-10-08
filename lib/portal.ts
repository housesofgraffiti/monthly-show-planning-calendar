import type { Organizer, Show } from './shows'

export type PortalProjection = {
  // Paid-only projection (projected_tickets, low, high).
  tickets: number | null
  low: number | null
  high: number | null
  // Total projection including comps (projected_total, total_low, total_high).
  totalTickets: number | null
  totalLow: number | null
  totalHigh: number | null
  revenue: number | null
  revenueLow: number | null
  revenueHigh: number | null
  confidence: ConfidenceTier | null
  selloutLikely: boolean
  paceLabel: string | null
  computedAt: string | null
}

export type ConfidenceTier = 'high' | 'low'

export const CONFIDENCE_NOTES: Record<ConfidenceTier, string> = {
  high: 'within 3 days, known venue',
  low: 'more than 3 days out, or new venue or format',
}

// confidence_tier is the upgraded column; the old confidence column is only the fallback.
export function resolveConfidence(tier: string | null, legacy: string | null): ConfidenceTier | null {
  const value = (tier?.trim() ? tier : (legacy ?? '')).trim().toLowerCase()
  return value === 'high' || value === 'low' ? value : null
}

export type PortalMatch = {
  eventId: string
  hasEvent: boolean
  // Paid tickets only. Revenue is paid only too.
  confirmed: number | null
  compTickets: number | null
  // Paid plus comp, as shown in the portal.
  totalTickets: number | null
  vips: number | null
  // Preformatted by the portal, e.g. "General Admission $28 · Soundbath + Show $38".
  ticketPrices: string | null
  ticketMix: string | null
  ticketsAvailable: number | null
  revenue: number | null
  projection: PortalProjection | null
}

export type PortalMap = Record<string, PortalMatch>

export type PortalSuggestion = { eventId: string; venue: string }

export type ImportCandidate = {
  eventId: string
  date: string
  venue: string
  ticketsAvailable: number | null
  projectedRevenue: number | null
  organizedBy: Organizer
  existing: { id: string; format: string; venue: string } | null
}

export type ImportChoice = { eventId: string; action: 'create' | 'link'; showId?: string }

export type ImportResult = { created: number; linked: number; skipped: number }

export function portalFor(show: Show, portal: PortalMap | undefined): PortalMatch | undefined {
  const id = show.portalEventId.trim()
  return id ? portal?.[id] : undefined
}

export const isPastShow = (show: Show, todayISO: string) => show.date < todayISO

// Every ticket count shown to the team is a total (paid + comp). When the total column is empty
// it falls back to the paid column.
export function confirmedTotal(m: PortalMatch): number | null {
  return m.totalTickets ?? m.confirmed
}

export function compCount(m: PortalMatch): number {
  if (m.compTickets != null) return m.compTickets
  if (m.totalTickets != null && m.confirmed != null) return Math.max(0, m.totalTickets - m.confirmed)
  return 0
}

export function confirmedLabel(m: PortalMatch) {
  return `${confirmedTotal(m) ?? 0}/${m.ticketsAvailable ?? '—'}`
}

export function sellThrough(m: PortalMatch): number | null {
  const total = confirmedTotal(m)
  if (!m.hasEvent || total == null || !m.ticketsAvailable) return null
  return total / m.ticketsAvailable
}

export function projectedTotal(p: PortalProjection): number | null {
  return p.totalTickets ?? p.tickets
}

export function projectedRange(p: PortalProjection): [number, number] | null {
  if (p.totalLow != null && p.totalHigh != null) return [p.totalLow, p.totalHigh]
  if (p.low != null && p.high != null) return [p.low, p.high]
  return null
}

export function rangeLabel(p: PortalProjection, separator = ' to ') {
  const range = projectedRange(p)
  if (!range) return null
  return `${Math.round(range[0])}${separator}${Math.round(range[1])}`
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
