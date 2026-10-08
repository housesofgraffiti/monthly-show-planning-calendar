import type { Show } from './shows'
import { isPastShow, type PortalMap, type PortalMatch, portalFor } from './portal'
import { projectedRevenueFor } from './adjustments'

export const isFlatFee = (show: Show) => show.revenueType === 'Flat fee'
export const isLocalProducer = (show: Show) => show.organizedBy === 'Local Producer'

// The one revenue rule used by cards, the table, and the summary totals.
export function showRevenue(show: Show, match: PortalMatch | undefined, past: boolean): number {
  if (show.status === 'Cancelled') return 0
  if (isFlatFee(show)) return show.flatFee ?? 0
  if (past && match?.hasEvent) return match.revenue ?? 0
  const projected = projectedRevenueFor(show, match, past)
  if (!past && projected != null) return projected
  return show.projectedRevenue ?? 0
}

export type ShowMoney = {
  // Real money: actuals for past shows, tickets already sold, contracted flat fees.
  lockedIn: number
  // Projected or planned money that has not been sold yet, at full value.
  remaining: number
}

const NO_MONEY: ShowMoney = { lockedIn: 0, remaining: 0 }

export function showMoney(show: Show, match: PortalMatch | undefined, past: boolean): ShowMoney {
  if (show.status === 'Cancelled') return NO_MONEY
  if (isFlatFee(show)) {
    const fee = show.flatFee ?? 0
    // A flat fee is contracted once the show is past or on sale; Tentative and Idea stay expected.
    return past || show.status === 'Confirmed' ? { lockedIn: fee, remaining: 0 } : { lockedIn: 0, remaining: fee }
  }
  if (past) return { lockedIn: showRevenue(show, match, true), remaining: 0 }

  const sold = match?.hasEvent ? (match.revenue ?? 0) : 0
  const projected = projectedRevenueFor(show, match, false) ?? show.projectedRevenue ?? 0
  return { lockedIn: sold, remaining: Math.max(0, projected - sold) }
}

export type CardMoney =
  | { kind: 'actual'; amount: number }
  | { kind: 'flat'; amount: number }
  | { kind: 'linked'; sold: number | null; projected: number }
  | { kind: 'plan'; amount: number }

// What a card shows as money, and in which style: actual and flat fee are real, the rest are estimates.
export function cardMoney(show: Show, match: PortalMatch | undefined, past: boolean): CardMoney | null {
  if (isFlatFee(show)) return { kind: 'flat', amount: show.flatFee ?? 0 }
  if (show.status === 'Cancelled') return null
  if (past) {
    const amount = showRevenue(show, match, true)
    return amount > 0 ? { kind: 'actual', amount } : null
  }
  const projection = projectedRevenueFor(show, match, false)
  if (match && (match.hasEvent || projection != null)) {
    return {
      kind: 'linked',
      sold: match.hasEvent ? (match.revenue ?? 0) : null,
      projected: projection ?? show.projectedRevenue ?? 0,
    }
  }
  const planned = show.projectedRevenue ?? 0
  return planned > 0 ? { kind: 'plan', amount: planned } : null
}

export function showRevenueOn(show: Show, portal: PortalMap | undefined, todayISO: string): number {
  return showRevenue(show, portalFor(show, portal), isPastShow(show, todayISO))
}

export function revenueTotals(shows: Show[], portal: PortalMap | undefined, todayISO: string) {
  let actual = 0
  let projected = 0
  for (const show of shows) {
    if (show.status === 'Cancelled') continue
    projected += showRevenueOn(show, portal, todayISO)
    const match = portalFor(show, portal)
    if (!isFlatFee(show) && match?.hasEvent) actual += match.revenue ?? 0
  }
  return { actual, projected }
}
