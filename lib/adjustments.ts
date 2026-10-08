import { projectedTotal, type PortalMatch } from './portal'
import type { AdjustmentReason, Show } from './shows'

// Suggested estimate = the model's projected total times this factor. "Other" has no suggestion.
export const ADJUSTMENT_MULTIPLIERS: Partial<Record<AdjustmentReason, number>> = {
  'Competing event': 0.75,
  'Holiday weekend': 0.85,
  'Billed headliner': 1.25,
  'Heavy promotion': 1.2,
  'Artist draw': 1.15,
  Weather: 0.85,
  'New producer or space': 1,
}

export function suggestedTotal(reason: AdjustmentReason, model: number | null): number | null {
  const factor = ADJUSTMENT_MULTIPLIERS[reason]
  if (factor == null || model == null) return null
  return Math.round(model * factor)
}

// The model's current projected total (paid + comp), or null when the show has no projection.
export function modelTotal(match: PortalMatch | undefined): number | null {
  const projection = match?.projection
  return projection ? projectedTotal(projection) : null
}

// The team's own estimate, only while it still matters: upcoming ticketed shows run by Sofar.
// Past shows have real numbers, and flat fee or Local Producer shows have no ticket projection.
export function activeAdjustment(show: Show, past: boolean): number | null {
  if (past || show.adjustedTotal == null) return null
  if (show.revenueType === 'Flat fee' || show.organizedBy === 'Local Producer') return null
  return show.adjustedTotal
}

// adjusted_total / projected_total, or 1 when there is nothing to scale by.
export function adjustmentScale(show: Show, match: PortalMatch | undefined, past: boolean): number {
  const adjusted = activeAdjustment(show, past)
  const model = modelTotal(match)
  if (adjusted == null || model == null || model <= 0) return 1
  return adjusted / model
}

// The model's projected revenue, scaled by the team's adjustment when there is one.
export function projectedRevenueFor(show: Show, match: PortalMatch | undefined, past: boolean): number | null {
  const revenue = match?.projection?.revenue
  if (revenue == null) return null
  return revenue * adjustmentScale(show, match, past)
}
