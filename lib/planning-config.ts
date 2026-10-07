// Tuning knobs for the monthly planning summary. Edit the numbers here; no other code needs to change.

// How much of a future show's revenue counts toward "Expected", by status (1 = 100%).
export const EXPECTED_VALUE_WEIGHTS = {
  Confirmed: 1,
  Tentative: 0.6,
  Idea: 0.3,
} as const

// "About N more Discovery shows" divides the gap by the typical Discovery revenue, read from
// planning_stats ('typical_discovery_revenue', in dollars). This default is used when that row is missing.
export const DEFAULT_DISCOVERY_REVENUE = 1900

// The window planning_stats averages over, shown in the note under the gap.
export const TYPICAL_DISCOVERY_WINDOW_DAYS = 180
