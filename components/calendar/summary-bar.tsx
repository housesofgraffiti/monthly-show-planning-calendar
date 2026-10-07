'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency, type OtherRevenueInput, type OtherRevenueLine, type Show } from '@/lib/shows'
import type { PortalMap } from '@/lib/portal'
import { planningSummary, type MixKey, type TypicalDiscovery } from '@/lib/planning'
import { EXPECTED_VALUE_WEIGHTS } from '@/lib/planning-config'
import { MixStrip } from './mix-strip'
import { OtherRevenuePanel } from './other-revenue-panel'
import { ProgressToTarget } from './progress-to-target'

type Props = {
  ym: string
  shows: Show[]
  target: number | null
  otherRevenue: OtherRevenueLine[]
  portal?: PortalMap
  todayISO: string
  typical: TypicalDiscovery | null
  highlight: MixKey | null
  onHighlight: (key: MixKey | null) => void
  onSaveTarget: (value: number) => Promise<void>
  onSaveOther: (input: OtherRevenueInput) => Promise<void>
  onDeleteOther: (id: string) => Promise<void>
  onCopyOther: () => Promise<{ copied: number; skipped: number }>
}

const percent = (n: number) => `${Math.round(n * 100)}%`

function Stat({
  label,
  hint,
  size,
  children,
}: {
  label: string
  hint: string
  size: 'lg' | 'sm'
  children: React.ReactNode
}) {
  const large = size === 'lg'
  return (
    <div className={cn('flex flex-col gap-1 bg-white', large ? 'px-5 py-5' : 'px-5 py-3.5')}>
      <span className="text-sm text-neutral-500">{label}</span>
      <div
        className={cn(
          'font-semibold tracking-tight tabular-nums text-neutral-900',
          large ? 'text-3xl md:text-4xl' : 'text-xl',
        )}
      >
        {children}
      </div>
      <span className="text-xs text-neutral-400">{hint}</span>
    </div>
  )
}

function TargetEditor({ target, onSave }: { target: number | null; onSave: (v: number) => Promise<void> }) {
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
      <span className="flex items-baseline">
        <span className="text-neutral-400">$</span>
        <input
          autoFocus
          inputMode="decimal"
          aria-label="Monthly revenue target"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-full min-w-0 bg-transparent outline-none"
        />
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(target != null ? String(target) : '')
        setEditing(true)
      }}
      className="rounded-md text-left hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
      aria-label="Edit monthly revenue target"
    >
      {target != null ? (
        <>
          <span className="text-neutral-400">$</span>
          {target.toLocaleString('en-US')}
        </>
      ) : (
        <span className="text-neutral-300">Set target</span>
      )}
    </button>
  )
}

export function SummaryBar({
  ym,
  shows,
  target,
  otherRevenue,
  portal,
  todayISO,
  typical,
  highlight,
  onHighlight,
  onSaveTarget,
  onSaveOther,
  onDeleteOther,
  onCopyOther,
}: Props) {
  const other = otherRevenue.reduce((sum, l) => sum + l.amount, 0)
  const s = planningSummary({ shows, portal, todayISO, other, target })

  return (
    <div className="flex flex-col gap-4">
      <ProgressToTarget summary={s} typical={typical} />
      <MixStrip shows={shows} highlight={highlight} onHighlight={onHighlight} />

      <section aria-label="Monthly summary" className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 lg:grid-cols-4">
          <Stat size="lg" label="Target" hint="Click to edit">
            <TargetEditor key={target ?? 'none'} target={target} onSave={onSaveTarget} />
          </Stat>
          <Stat size="lg" label="Projected" hint="Everything at full value, with other revenue">
            {formatCurrency(s.projected)}
          </Stat>
          <Stat size="lg" label="Over / (under)" hint="Projected minus target">
            {s.variance == null ? (
              <span className="text-neutral-300">—</span>
            ) : (
              <span className={cn(s.variance >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {s.variance >= 0 ? formatCurrency(s.variance) : `(${formatCurrency(Math.abs(s.variance))})`}
              </span>
            )}
          </Stat>
          <Stat
            size="lg"
            label="Expected"
            hint={`Tentative at ${percent(EXPECTED_VALUE_WEIGHTS.Tentative)}, Idea at ${percent(EXPECTED_VALUE_WEIGHTS.Idea)}`}
          >
            {formatCurrency(s.expected)}
          </Stat>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-3 lg:grid-cols-5">
          <Stat size="sm" label="Actual to date" hint="Past shows">
            {formatCurrency(s.actual)}
          </Stat>
          <Stat size="sm" label="Confirmed" hint="Upcoming, confirmed">
            {formatCurrency(s.confirmed)}
          </Stat>
          <Stat size="sm" label="Other revenue" hint="Sponsorships this month">
            {formatCurrency(s.other)}
          </Stat>
          <Stat size="sm" label="Shows" hint="Non-cancelled">
            {s.count}
          </Stat>
          <Stat size="sm" label="Avg per show" hint="Show revenue ÷ shows">
            {s.average == null ? <span className="text-neutral-300">—</span> : formatCurrency(s.average)}
          </Stat>
        </div>
      </section>

      <OtherRevenuePanel ym={ym} lines={otherRevenue} onSave={onSaveOther} onDelete={onDeleteOther} onCopy={onCopyOther} />
    </div>
  )
}
