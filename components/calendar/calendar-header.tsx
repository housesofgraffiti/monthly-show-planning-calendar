import { ChevronLeft, ChevronRight, Mail, Plus } from 'lucide-react'
import { monthTitle } from '@/lib/dates'
import { CATEGORIES, REGIONS, statusLabel, type Region } from '@/lib/shows'
import { isStale, timeAgo } from '@/lib/portal'
import type { Viewer } from '@/lib/use-calendar-realtime'
import { CATEGORY_STYLES } from './category-styles'
import { PresenceBubbles } from './presence-bubbles'

type View = 'calendar' | 'table'

type HeaderProps = {
  ym: string
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  onAdd: () => void
  onImport?: () => void
  view: View
  onViewChange: (view: View) => void
  viewers?: Viewer[]
  region: Region | 'All'
  onRegionChange: (region: Region | 'All') => void
}

const outlineBtn =
  'inline-flex h-11 items-center justify-center border border-neutral-200 bg-white text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900'

export function CalendarHeader({
  ym,
  onToday,
  onPrev,
  onNext,
  onAdd,
  onImport,
  view,
  onViewChange,
  viewers = [],
  region,
  onRegionChange,
}: HeaderProps) {
  const { month, year } = monthTitle(ym)
  return (
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          Sofar Sounds LA · Show Calendar
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl" aria-live="polite">
          {month} <span className="text-neutral-300">{year}</span>
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap sm:whitespace-nowrap">
        <PresenceBubbles viewers={viewers} />
        <div
          role="group"
          aria-label="Calendar view"
          className="flex rounded-xl border border-neutral-200 bg-white p-0.5 text-sm font-medium"
        >
          {(['calendar', 'table'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              aria-pressed={view === v}
              className={`rounded-[0.6rem] px-3.5 py-2 capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                view === v ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Region filter" className="flex rounded-xl border border-neutral-200 bg-white p-0.5 text-sm font-medium">
          {(['All', ...REGIONS] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onRegionChange(value)}
              aria-pressed={region === value}
              className={`rounded-[0.6rem] px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                region === value ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <button type="button" onClick={onToday} className={`${outlineBtn} rounded-xl px-4`}>
          Today
        </button>
        <div className="flex">
          <button type="button" onClick={onPrev} aria-label="Previous month" className={`${outlineBtn} w-11 rounded-l-xl`}>
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next month"
            className={`${outlineBtn} -ml-px w-11 rounded-r-xl`}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        {onImport && (
          <button type="button" onClick={onImport} className={`${outlineBtn} ml-auto rounded-xl px-4 sm:ml-0`}>
            Import from portal
          </button>
        )}
        <button
          type="button"
          onClick={onAdd}
          className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 sm:ml-0"
        >
          <Plus className="size-4" aria-hidden />
          Add show
        </button>
      </div>
    </header>
  )
}

export function Legend({
  syncing,
  portalSyncedAt,
  onMarkers,
  showSends,
  onToggleSends,
}: {
  syncing: boolean
  portalSyncedAt?: string | null
  onMarkers?: () => void
  showSends?: boolean
  onToggleSends?: () => void
}) {
  const stale = portalSyncedAt ? isStale(portalSyncedAt) : false
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm text-neutral-600">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {CATEGORIES.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${CATEGORY_STYLES[c].dot}`} aria-hidden />
            {c}
          </li>
        ))}
        <li className="hidden h-4 w-px bg-neutral-200 sm:block" aria-hidden />
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-5 rounded border border-neutral-400" aria-hidden />
          {statusLabel('Confirmed')}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-5 rounded border border-dashed border-neutral-400" aria-hidden />
          Idea / Tentative
        </li>
        <li className="text-neutral-400 line-through">Cancelled</li>
        {onMarkers && (
          <li>
            <button
              type="button"
              onClick={onMarkers}
              className="rounded-md text-neutral-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              Day markers
            </button>
          </li>
        )}
        {onToggleSends && (
          <li>
            <button
              type="button"
              onClick={onToggleSends}
              aria-pressed={showSends}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                showSends
                  ? 'border-teal-300 bg-teal-50 text-teal-800'
                  : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              <Mail className="size-3.5" aria-hidden />
              Sends
            </button>
          </li>
        )}
      </ul>
      <div className="flex items-center gap-3">
        {portalSyncedAt && (
          <p className={stale ? 'font-medium text-amber-600' : 'text-neutral-500'}>
            Portal synced {timeAgo(portalSyncedAt)}
          </p>
        )}
        <p className="text-neutral-500" aria-live="polite">
          {syncing ? 'Syncing…' : 'Syncs every 30s'}
        </p>
      </div>
    </div>
  )
}
