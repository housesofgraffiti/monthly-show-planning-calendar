// Tuning knobs for the monthly planning summary. Edit the numbers here; no other code needs to change.

// How much of a future show's revenue counts toward "Expected", by status (1 = 100%).
export const EXPECTED_VALUE_WEIGHTS = {
  Confirmed: 1,
  Tentative: 0.6,
  Idea: 0.3,
} as const

// "About N more Discovery shows" divides the gap by the typical Discovery revenue.
// The typical value is the average actual revenue of recent Discovery shows. With fewer
// than DISCOVERY_MIN_SAMPLE of them, this default is used instead.
export const DEFAULT_DISCOVERY_REVENUE = 1900
export const DISCOVERY_MIN_SAMPLE = 5
export const DISCOVERY_LOOKBACK_DAYS = 90
