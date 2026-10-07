import type { Show } from './shows'
import { isPastShow, type PortalMap, type PortalMatch, portalFor } from './portal'

export const isFlatFee = (show: Show) => show.revenueType === 'Flat fee'
export const isLocalProducer = (show: Show) => show.organizedBy === 'Local Producer'

// The one revenue rule used by cards, the table, and the summary totals.
export function showRevenue(show: Show, match: PortalMatch | undefined, past: boolean): number {
  if (show.status === 'Cancelled') return 0
  if (isFlatFee(show)) return show.flatFee ?? 0
  if (past && match?.hasEvent) return match.revenue ?? 0
  if (!past && match?.projection?.revenue != null) return match.projection.revenue
  return show.projectedRevenue ?? 0
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
