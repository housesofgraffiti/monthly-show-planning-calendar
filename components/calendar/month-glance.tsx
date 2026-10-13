'use client'

import { useState, type CSSProperties } from 'react'
import { ChevronDown, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { monthTitle } from '@/lib/dates'
import { formatCurrency } from '@/lib/shows'
import { showsToGo, type PlanningSummary, type TypicalDiscovery } from '@/lib/planning'
import { EXPECTED_VALUE_WEIGHTS, TYPICAL_DISCOVERY_WINDOW_DAYS } from '@/lib/planning-config'

type Segment = { key: string; label: string; value: number; className: string; style?: CSSProperties }

const PROJECTED_STRIPES: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 4px, rgba(5, 150, 105, 0.85) 4px 7px)',
}

const EXPECTED_STRIPES: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 7px, rgba(5, 150, 105, 0.3) 7px 9px)',
}

const percent = (n: number) => `${Math.round(n * 100)}%`
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900'

function GoalEditor({ target, onSave }: { target: number | null; onSave: (v: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = async () => {
    setEditing(false)
    const value = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(value) || value < 0 || value === target) return
    await onSave(value)
  }

  if (editing) {
    return (
      <span className="inline-flex items-baseline rounded-md border-b-2 border-neutral-900 align-baseline">
        <span className="text-neutral-400">$</span>
        <input
          autoFocus
          inputMode="decimal"
          aria-label="Monthly goal"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-[7ch] min-w-0 bg-transparent font-semibold tabular-nums outline-none"
        />
      </span>
    )
  }

  const startEditing = () => {
    setDraft(target != null ? String(target) : '')
    setEditing(true)
  }

  if (target == null) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className={cn('inline-flex items-center gap-1.5 rounded-md text-neutral-500 underline underline-offset-4 hover:text-neutral-900', focusRing)}
      >
        Set a monthly goal
        <Pencil className="size-4" aria-hidden />
      </button>
    )
  }

  return (
    <>
      <span className="tabular-nums">{formatCurrency(target)}</span>
      <button
        type="button"
        onClick={startEditing}
        aria-label="Edit monthly goal"
        title="Edit the monthly goal"
        className={cn(
          'ml-0.5 inline-flex size-8 items-center justify-center rounded-full align-middle text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-800',
          focusRing,
        )}
      >
        <Pencil className="size-4" aria-hidden />
      </button>
    </>
  )
}

function StatBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-white px-3 py-3 sm:px-5 sm:py-4">
      <span className="text-xs leading-snug text-neutral-500 sm:text-sm">{label}</span>
      <span className="break-words text-lg font-semibold tracking-tight tabular-nums text-neutral-900 sm:text-2xl">
        {children}
      </span>
    </div>
  )
}

function MoreRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums text-neutral-900">{children}</dd>
      <dd className="text-xs text-neutral-500">{hint}</dd>
    </div>
  )
}

export function MonthGlance({
  ym,
  summary,
  typical,
  onSaveTarget,
}: {
  ym: string
  summary: PlanningSummary
  typical: TypicalDiscovery | null
  onSaveTarget: (value: number) => Promise<void>
}) {
  const [more, setMore] = useState(false)
  const { month } = monthTitle(ym)
  const { target } = summary
  const gap = summary.gap == null ? null : Math.round(summary.gap)
  const shows = gap != null && gap > 0 && typical ? showsToGo(gap, typical) : null

  const segments: Segment[] = [
    { key: 'in', label: 'Already in', value: summary.lockedIn, className: 'bg-neutral-900' },
    {
      key: 'expected',
      label: 'Still expected',
      value: summary.projectedRemaining,
      className: 'bg-emerald-200',
      style: PROJECTED_STRIPES,
    },
    {
      key: 'tentative',
      label: 'Tentative and Idea shows, counted at a discount',
      value: summary.tentativeExpected,
      className: 'bg-emerald-50',
      style: EXPECTED_STRIPES,
    },
  ]

  const scale = Math.max(target ?? 0, summary.expected, 1)
  const targetPct = target != null && target > 0 ? (target / scale) * 100 : null
  const description = `${segments.map((s) => `${s.label} ${formatCurrency(s.value)}`).join(', ')}${
    target != null ? `, against a goal of ${formatCurrency(target)}` : ''
  }`

  return (
    <section
      aria-label="Month at a glance"
      data-tour="progress"
      className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white px-4 py-5 sm:px-6"
    >
      <h2 className="text-sm font-medium text-neutral-500">Month at a glance</h2>

      <p className="text-balance text-xl font-semibold leading-snug tracking-tight text-neutral-900 sm:text-2xl lg:text-3xl" aria-live="polite">
        {month}: {formatCurrency(summary.projectedTotal)} expected
        {target != null ? (
          <>
            {' '}
            of our <GoalEditor target={target} onSave={onSaveTarget} /> goal.{' '}
            {gap != null && gap > 0 && <span className="text-red-600">{formatCurrency(gap)} short.</span>}
            {gap != null && gap < 0 && <span className="text-emerald-600">{formatCurrency(-gap)} over goal.</span>}
            {gap === 0 && <span className="text-emerald-600">Right on goal.</span>}
          </>
        ) : (
          <>
            . <GoalEditor target={target} onSave={onSaveTarget} />
          </>
        )}
      </p>

      <div className="relative min-w-0 pt-6">
        <div role="img" aria-label={description} className="flex h-8 gap-0.5 overflow-hidden rounded-full bg-neutral-100">
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
              Goal {formatCurrency(target)}
            </span>
            <span
              aria-hidden
              className="absolute -bottom-1 top-5 z-10 w-0.5 -translate-x-1/2 rounded-full bg-neutral-900"
              style={{ left: `${targetPct}%` }}
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-pretty text-sm leading-relaxed text-neutral-700">
          <span className="font-medium tabular-nums text-neutral-900">{formatCurrency(summary.lockedIn)}</span> already in
          (finished shows, tickets sold, flat fees, sponsorships) ·{' '}
          <span className="font-medium tabular-nums text-neutral-900">{formatCurrency(summary.projectedRemaining)}</span>{' '}
          still expected from ticket sales
        </p>
        {summary.tentativeExpected > 0 && (
          <p className="text-xs text-neutral-500">
            The pale stripes on the bar are Tentative and Idea shows, counted at a discount.
          </p>
        )}
        {shows != null && (
          <p className="text-pretty text-sm leading-relaxed text-neutral-700">
            About {shows} more Discovery {shows === 1 ? 'show' : 'shows'} would close the gap.
            {typical && (
              <span className="text-neutral-500">
                {' '}
                A typical Discovery show brings in about {formatCurrency(typical.value)}
                {typical.isDefault ? ' (default estimate).' : ` (last ${TYPICAL_DISCOVERY_WINDOW_DAYS} days).`}
              </span>
            )}
          </p>
        )}
      </div>

      <div
        data-tour="summary"
        className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200"
      >
        <StatBox label="Already in">{formatCurrency(summary.lockedIn)}</StatBox>
        <StatBox label="Still expected">{formatCurrency(summary.projectedRemaining)}</StatBox>
        <StatBox label="Shows this month">{summary.count}</StatBox>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          aria-expanded={more}
          aria-controls="more-numbers"
          className={cn(
            'inline-flex w-fit items-center gap-1 rounded-md py-1 text-sm font-medium text-neutral-700 underline-offset-4 hover:text-neutral-900 hover:underline',
            focusRing,
          )}
        >
          More numbers
          <ChevronDown className={cn('size-4 transition-transform', more && 'rotate-180')} aria-hidden />
        </button>
        {more && (
          <dl id="more-numbers" className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <MoreRow label="Over / (under)" hint="Expected minus the goal.">
              {summary.variance == null ? (
                <span className="text-neutral-300">{'\u2014'}</span>
              ) : (
                <span className={cn(summary.variance >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {summary.variance >= 0
                    ? formatCurrency(summary.variance)
                    : `(${formatCurrency(Math.abs(summary.variance))})`}
                </span>
              )}
            </MoreRow>
            <MoreRow label="Avg per show" hint="Show revenue divided by the number of shows.">
              {summary.average == null ? <span className="text-neutral-300">{'\u2014'}</span> : formatCurrency(summary.average)}
            </MoreRow>
            {summary.tentativeCount > 0 && (
              <MoreRow
                label="Expected incl. Tentative and Idea"
                hint={`Counts Tentative shows at ${percent(EXPECTED_VALUE_WEIGHTS.Tentative)} and Idea shows at ${percent(EXPECTED_VALUE_WEIGHTS.Idea)}.`}
              >
                {formatCurrency(summary.expected)}
              </MoreRow>
            )}
            <MoreRow label="Projected remaining" hint="Not sold yet, from shows that are on sale.">
              {formatCurrency(summary.projectedRemaining)}
            </MoreRow>
          </dl>
        )}
      </div>
    </section>
  )
}
