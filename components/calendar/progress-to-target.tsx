import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/shows'
import { showsToGo, type PlanningSummary, type TypicalDiscovery } from '@/lib/planning'
import { TYPICAL_DISCOVERY_WINDOW_DAYS } from '@/lib/planning-config'

type Segment = { key: string; label: string; value: number; className: string; style?: CSSProperties }

const STRIPES: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 5px, rgba(5, 150, 105, 0.4) 5px 7px)',
}

function GapText({ summary, typical }: { summary: PlanningSummary; typical: TypicalDiscovery | null }) {
  if (summary.gap == null) {
    return <p className="text-base text-neutral-500">Set a target to see the gap.</p>
  }

  const gap = Math.round(summary.gap)
  if (gap === 0) {
    return <p className="text-xl font-semibold text-neutral-900">Right on target</p>
  }
  if (gap < 0) {
    return <p className="text-xl font-semibold text-emerald-600">{formatCurrency(-gap)} over target</p>
  }

  const n = typical ? showsToGo(gap, typical) : null
  return (
    <div className="flex flex-col gap-1">
      <p className="text-base leading-snug text-neutral-600">
        <span className="text-xl font-semibold text-neutral-900">{formatCurrency(gap)} to go</span>
        {n != null && `, about ${n} more Discovery ${n === 1 ? 'show' : 'shows'}`}
      </p>
      {typical && (
        <p className="text-xs text-neutral-400">
          Typical Discovery show {formatCurrency(typical.value)}
          {typical.isDefault ? ' (default estimate)' : ` (last ${TYPICAL_DISCOVERY_WINDOW_DAYS} days)`}
        </p>
      )}
    </div>
  )
}

export function ProgressToTarget({
  summary,
  typical,
}: {
  summary: PlanningSummary
  typical: TypicalDiscovery | null
}) {
  const { target } = summary
  const segments: Segment[] = [
    { key: 'actual', label: 'Actual', value: summary.actual, className: 'bg-neutral-900' },
    { key: 'other', label: 'Other revenue', value: summary.other, className: 'bg-neutral-400' },
    { key: 'confirmed', label: 'Confirmed', value: summary.confirmedExpected, className: 'bg-emerald-600' },
    {
      key: 'tentative',
      label: 'Tentative and Idea (expected)',
      value: summary.tentativeExpected,
      className: 'bg-emerald-100',
      style: STRIPES,
    },
  ]

  const scale = Math.max(target ?? 0, summary.expected, 1)
  const targetPct = target != null && target > 0 ? (target / scale) * 100 : null
  const description = `${segments.map((s) => `${s.label} ${formatCurrency(s.value)}`).join(', ')}${
    target != null ? `, against a target of ${formatCurrency(target)}` : ''
  }`

  return (
    <section
      aria-label="Progress to target"
      className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white px-5 py-5 sm:px-6"
    >
      <h2 className="text-sm font-medium text-neutral-500">Progress to target</h2>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:gap-8">
        <div className="relative min-w-0 flex-1 pt-6">
          <div
            role="img"
            aria-label={description}
            className="flex h-8 gap-0.5 overflow-hidden rounded-full bg-neutral-100"
          >
            {segments.map(
              (s) =>
                s.value > 0 && (
                  <div
                    key={s.key}
                    title={`${s.label}: ${formatCurrency(s.value)}`}
                    className={cn('h-full', s.className)}
                    style={{ ...s.style, width: `${(s.value / scale) * 100}%` }}
                  />
                ),
            )}
          </div>

          {targetPct != null && target != null && (
            <>
              <span
                className="absolute top-0 whitespace-nowrap text-xs font-medium text-neutral-900"
                style={{ left: `${targetPct}%`, transform: `translateX(${targetPct > 85 ? '-100%' : '-50%'})` }}
              >
                Target {formatCurrency(target)}
              </span>
              <span
                aria-hidden
                className="absolute -bottom-1 top-5 z-10 w-0.5 -translate-x-1/2 rounded-full bg-neutral-900"
                style={{ left: `${targetPct}%` }}
              />
            </>
          )}
        </div>

        <div className="lg:w-80 lg:shrink-0" aria-live="polite">
          <GapText summary={summary} typical={typical} />
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn('size-3 rounded-full border border-neutral-900/10', s.className)}
              style={s.style}
            />
            <span>{s.label}</span>
            <span className="font-medium tabular-nums text-neutral-900">{formatCurrency(s.value)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
