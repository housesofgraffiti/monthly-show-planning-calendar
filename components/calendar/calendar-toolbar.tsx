'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, HelpCircle, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/shows'
import { isStale } from '@/lib/portal'
import { TAG_HELP } from '@/lib/glossary'
import { CATEGORY_STYLES } from './category-styles'
import { SyncNowButton } from './sync-now-button'

const triggerCls =
  'inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900'

function plainAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  return `${Math.round(hours / 24)} days ago`
}

function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return { open, setOpen, ref }
}

function KeyRow({ sample, children }: { sample: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[5.5rem_1fr] items-start gap-3">
      <span className="flex min-h-5 flex-wrap items-center gap-1.5 pt-0.5">{sample}</span>
      <span className="text-pretty leading-snug text-neutral-700">{children}</span>
    </li>
  )
}

function TagSample({ className, children }: { className: string; children: string }) {
  return <span className={cn('rounded-sm px-1 text-[10px] font-semibold leading-tight', className)}>{children}</span>
}

function KeyPopover() {
  const { open, setOpen, ref } = usePopover()
  return (
    <div ref={ref} data-tour="key" className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={triggerCls}
      >
        <HelpCircle className="size-4 text-neutral-500" aria-hidden />
        Key
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Key to the calendar"
          className="absolute left-0 top-full z-30 mt-2 max-h-[70dvh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 text-sm shadow-lg"
        >
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">What things on the calendar mean</h3>
          <ul className="flex flex-col gap-3">
            <KeyRow
              sample={CATEGORIES.map((c) => (
                <span key={c} className="flex items-center gap-1 text-xs text-neutral-600">
                  <span className={cn('size-2.5 rounded-full', CATEGORY_STYLES[c].dot)} aria-hidden />
                  {c}
                </span>
              ))}
            >
              The color shows the kind of show: Core, Premium or Special.
            </KeyRow>
            <KeyRow sample={<span aria-hidden className="h-4 w-8 rounded border-2 border-solid border-neutral-500" />}>
              Solid border: On sale. The event page is live.
            </KeyRow>
            <KeyRow sample={<span aria-hidden className="h-4 w-8 rounded border-2 border-dashed border-neutral-400" />}>
              Dashed border: Idea or Tentative. Not locked in yet.
            </KeyRow>
            <KeyRow sample={<span className="text-neutral-400 line-through">Cancelled</span>}>
              Faded with a line through it: Cancelled.
            </KeyRow>
            <KeyRow sample={<span className="font-medium tabular-nums text-neutral-700">~$900</span>}>
              A ~ means an estimate, not money in hand.
            </KeyRow>
            <KeyRow sample={<TagSample className="bg-red-100 text-red-700">Behind</TagSample>}>
              {TAG_HELP.Behind} Shown in the last 3 days.
            </KeyRow>
            <KeyRow sample={<TagSample className="bg-emerald-100 text-emerald-700">Ahead</TagSample>}>
              {TAG_HELP.Ahead} Shown in the last 3 days.
            </KeyRow>
            <KeyRow sample={<TagSample className="bg-amber-100 text-amber-800">Sellout likely</TagSample>}>
              {TAG_HELP['Sellout likely']}
            </KeyRow>
            <KeyRow sample={<TagSample className="bg-neutral-900/10 text-neutral-700">LP</TagSample>}>
              LP: run by a local producer. We don&apos;t track its sales pace.
            </KeyRow>
            <KeyRow sample={<span className="text-[11px] text-neutral-500">Not merchandised</span>}>
              The event page hasn&apos;t been updated for this show yet.
            </KeyRow>
            <KeyRow sample={<span className="text-[11px] font-medium uppercase tracking-wider text-sky-700">Open</span>}>
              A blue Open night is a Friday, Saturday or Sunday with no show booked.
            </KeyRow>
          </ul>
        </div>
      )}
    </div>
  )
}

function ShowMenu({
  showMarkers,
  onToggleMarkers,
  showSends,
  onToggleSends,
  onMarkers,
}: {
  showMarkers: boolean
  onToggleMarkers: () => void
  showSends: boolean
  onToggleSends: () => void
  onMarkers?: () => void
}) {
  const { open, setOpen, ref } = usePopover()
  const row = 'flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50'
  return (
    <div ref={ref} data-tour="show-menu" className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={triggerCls}
      >
        <SlidersHorizontal className="size-4 text-neutral-500" aria-hidden />
        Show on calendar
        <ChevronDown className={cn('size-4 text-neutral-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div
          role="group"
          aria-label="Show on calendar"
          className="absolute left-0 top-full z-30 mt-2 flex w-64 max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg"
        >
          <label className={row}>
            <input type="checkbox" checked={showMarkers} onChange={onToggleMarkers} className="size-5 accent-neutral-900" />
            Holidays and events
          </label>
          <label className={row}>
            <input type="checkbox" checked={showSends} onChange={onToggleSends} className="size-5 accent-neutral-900" />
            Marketing emails and texts
          </label>
          {onMarkers && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onMarkers()
              }}
              className="mt-1 min-h-10 rounded-lg border-t border-neutral-100 px-2 py-1.5 text-left text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              Add or edit holidays and events
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function CalendarToolbar({
  portalSyncedAt,
  onMarkers,
  showMarkers,
  onToggleMarkers,
  showSends,
  onToggleSends,
  onSynced,
}: {
  portalSyncedAt?: string | null
  onMarkers?: () => void
  showMarkers: boolean
  onToggleMarkers: () => void
  showSends: boolean
  onToggleSends: () => void
  onSynced?: () => void
}) {
  const stale = portalSyncedAt ? isStale(portalSyncedAt) : false
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <KeyPopover />
        <ShowMenu
          showMarkers={showMarkers}
          onToggleMarkers={onToggleMarkers}
          showSends={showSends}
          onToggleSends={onToggleSends}
          onMarkers={onMarkers}
        />
      </div>
      <div
        data-tour="sync-status"
        className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-3xl bg-neutral-100 py-1 pl-3.5 pr-1 text-sm"
      >
        <span className={cn('min-w-0', stale ? 'font-medium text-amber-700' : 'text-neutral-600')}>
          {portalSyncedAt ? `Ticket numbers updated ${plainAgo(portalSyncedAt)}` : 'Ticket numbers not updated yet'}
        </span>
        {onSynced && (
          <>
            <span aria-hidden className="text-neutral-400">
              {'\u00b7'}
            </span>
            <SyncNowButton onSynced={onSynced} className="rounded-full bg-white px-3 py-1.5" />
          </>
        )}
      </div>
    </div>
  )
}
