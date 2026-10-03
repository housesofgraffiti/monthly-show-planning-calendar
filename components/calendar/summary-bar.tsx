'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency, summarize, type Show } from '@/lib/shows'

type Props = {
  shows: Show[]
  target: number | null
  onSaveTarget: (value: number) => Promise<void>
}

function Stat({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 bg-white px-5 py-5">
      <span className="text-sm text-neutral-500">{label}</span>
      <div className="text-2xl font-semibold tracking-tight tabular-nums text-neutral-900 md:text-[1.75rem]">
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

export function SummaryBar({ shows, target, onSaveTarget }: Props) {
  const s = summarize(shows, target)
  const variance = s.variance

  return (
    <section
      aria-label="Monthly summary"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-3 lg:grid-cols-6"
    >
      <Stat label="Monthly target" hint="Click to edit">
        <TargetEditor key={target ?? 'none'} target={target} onSave={onSaveTarget} />
      </Stat>
      <Stat label="Planned" hint="All non-cancelled">
        {formatCurrency(s.planned)}
      </Stat>
      <Stat label="Confirmed" hint="Confirmed only">
        {formatCurrency(s.confirmed)}
      </Stat>
      <Stat label="Over / (under)" hint="Planned vs. target">
        {variance == null ? (
          <span className="text-neutral-300">—</span>
        ) : (
          <span className={cn(variance >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            {variance >= 0 ? formatCurrency(variance) : `(${formatCurrency(Math.abs(variance))})`}
          </span>
        )}
      </Stat>
      <Stat label="Shows" hint="Non-cancelled">
        {s.count}
      </Stat>
      <Stat label="Avg / show" hint="Planned ÷ shows">
        {s.average == null ? <span className="text-neutral-300">—</span> : formatCurrency(s.average)}
      </Stat>
    </section>
  )
}
