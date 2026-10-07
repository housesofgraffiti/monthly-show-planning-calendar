import { isPastShow, portalFor, type PortalMap } from './portal'
import { isFlatFee, isLocalProducer, showMoney } from './revenue'
import type { Show } from './shows'
import { DEFAULT_DISCOVERY_REVENUE, EXPECTED_VALUE_WEIGHTS } from './planning-config'

export type PlanningSummary = {
  target: number | null
  // Real money: past actuals, tickets already sold, flat fees, plus other revenue.
  lockedIn: number
  // Projected or planned money still to come from On sale shows.
  projectedRemaining: number
  // Locked in + projected remaining.
  projectedTotal: number
  // Tentative and Idea shows, kept apart from the two buckets above.
  tentativeFull: number
  tentativeExpected: number
  tentativeCount: number
  // Projected total + tentative and Idea at their expected discount.
  expected: number
  variance: number | null
  gap: number | null
  count: number
  average: number | null
}

// Money is split once per show by showMoney(): what is already real versus what is still a projection.
// Other revenue counts as locked in, and every comparison to the target uses projected total.
export function planningSummary({
  shows,
  portal,
  todayISO,
  other,
  target,
}: {
  shows: Show[]
  portal: PortalMap | undefined
  todayISO: string
  other: number
  target: number | null
}): PlanningSummary {
  let showsLockedIn = 0
  let projectedRemaining = 0
  let tentative = 0
  let idea = 0
  let tentativeCount = 0
  let count = 0

  for (const show of shows) {
    if (show.status === 'Cancelled') continue
    count += 1
    const past = isPastShow(show, todayISO)
    const money = showMoney(show, portalFor(show, portal), past)
    showsLockedIn += money.lockedIn

    if (past || show.status === 'Confirmed') {
      projectedRemaining += money.remaining
    } else {
      tentativeCount += 1
      if (show.status === 'Tentative') tentative += money.remaining
      else idea += money.remaining
    }
  }

  const lockedIn = showsLockedIn + other
  const projectedTotal = lockedIn + projectedRemaining
  const tentativeExpected = tentative * EXPECTED_VALUE_WEIGHTS.Tentative + idea * EXPECTED_VALUE_WEIGHTS.Idea
  const showsTotal = showsLockedIn + projectedRemaining + tentative + idea

  return {
    target,
    lockedIn,
    projectedRemaining,
    projectedTotal,
    tentativeFull: tentative + idea,
    tentativeExpected,
    tentativeCount,
    expected: projectedTotal + tentativeExpected,
    variance: target == null ? null : projectedTotal - target,
    gap: target == null ? null : target - projectedTotal,
    count,
    average: count ? showsTotal / count : null,
  }
}

export type TypicalDiscovery = { value: number; isDefault: boolean }

// `stat` is planning_stats.typical_discovery_revenue in dollars, or null when the row is missing.
export function typicalDiscovery(stat: number | null): TypicalDiscovery {
  if (stat == null || !Number.isFinite(stat) || stat <= 0) {
    return { value: DEFAULT_DISCOVERY_REVENUE, isDefault: true }
  }
  return { value: stat, isDefault: false }
}

export function showsToGo(gap: number, typical: TypicalDiscovery) {
  return Math.max(1, Math.ceil(gap / typical.value))
}

export const MIX_KEYS = ['Core', 'Premium', 'Special', 'Local Producer', 'Flat fee'] as const
export type MixKey = (typeof MIX_KEYS)[number]

export function matchesMix(show: Show, key: MixKey): boolean {
  if (show.status === 'Cancelled') return false
  switch (key) {
    case 'Local Producer':
      return isLocalProducer(show)
    case 'Flat fee':
      return isFlatFee(show)
    default:
      return show.category === key
  }
}

export function mixCounts(shows: Show[]): Record<MixKey, number> {
  return Object.fromEntries(
    MIX_KEYS.map((key) => [key, shows.filter((show) => matchesMix(show, key)).length]),
  ) as Record<MixKey, number>
}

const WEEKEND_NIGHTS = new Set([5, 6, 0])

export function isOpenNight(iso: string, dayShows: Show[], todayISO: string) {
  if (iso < todayISO) return false
  if (!WEEKEND_NIGHTS.has(new Date(`${iso}T12:00:00Z`).getUTCDay())) return false
  return dayShows.every((show) => show.status === 'Cancelled')
}
