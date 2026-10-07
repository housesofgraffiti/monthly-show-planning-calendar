import { isPastShow, type PortalMap } from './portal'
import { isFlatFee, isLocalProducer, showRevenueOn } from './revenue'
import type { Show } from './shows'
import { DEFAULT_DISCOVERY_REVENUE, EXPECTED_VALUE_WEIGHTS } from './planning-config'

export type PlanningSummary = {
  target: number | null
  actual: number
  other: number
  confirmed: number
  confirmedExpected: number
  tentativeFull: number
  tentativeExpected: number
  expected: number
  projected: number
  variance: number | null
  gap: number | null
  count: number
  average: number | null
}

// Every figure uses the shared revenue rule (flat fees, actuals, projections, planned),
// and other revenue is included in every comparison to the target.
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
  let actual = 0
  let confirmed = 0
  let tentative = 0
  let idea = 0
  let count = 0

  for (const show of shows) {
    if (show.status === 'Cancelled') continue
    count += 1
    const value = showRevenueOn(show, portal, todayISO)
    if (isPastShow(show, todayISO)) actual += value
    else if (show.status === 'Confirmed') confirmed += value
    else if (show.status === 'Tentative') tentative += value
    else idea += value
  }

  const confirmedExpected = confirmed * EXPECTED_VALUE_WEIGHTS.Confirmed
  const tentativeExpected = tentative * EXPECTED_VALUE_WEIGHTS.Tentative + idea * EXPECTED_VALUE_WEIGHTS.Idea
  const showsTotal = actual + confirmed + tentative + idea
  const expected = actual + other + confirmedExpected + tentativeExpected
  const projected = showsTotal + other

  return {
    target,
    actual,
    other,
    confirmed,
    confirmedExpected,
    tentativeFull: tentative + idea,
    tentativeExpected,
    expected,
    projected,
    variance: target == null ? null : projected - target,
    gap: target == null ? null : target - expected,
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
