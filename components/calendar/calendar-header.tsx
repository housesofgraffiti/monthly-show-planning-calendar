import { ChevronLeft, ChevronRight, Mail, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { monthTitle } from '@/lib/dates'
import { CATEGORIES, REGIONS, statusLabel, type Region } from '@/lib/shows'
import { isStale, timeAgo } from '@/lib/portal'
import type { Viewer } from '@/lib/use-calendar-realtime'
import { CATEGORY_STYLES } from './category-styles'
import { HelpMenu } from './help-menu'
import { PresenceBubbles } from './presence-bubbles'

type View = 'calendar' | 'table' | 'venues'

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
  onTour: () => void
  onFaq: () => void
}

const outlineBtn =
  'inline-flex h-11 items-center justify-center border border-neutral-200 bg-white text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900'

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
  onTour,
  onFaq,
}: HeaderProps) {
  const { month, year } = monthTitle(ym)
  return (
    <header className="flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center justify-between gap-x-4 gap-y-3 sm:flex-wrap sm:items-end">
        <div data-tour="header" className="flex min-w-0 flex-col gap-1.5">
          <p className="hidden text-xs font-medium uppercase tracking-[0.18em] text-neutral-400 sm:block">
            Sofar Sounds LA · Show Calendar
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous month"
              className={cn('-ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 sm:hidden', focusRing)}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <h1
              className="whitespace-nowrap text-xl font-semibold tracking-tight text-neutral-900 sm:text-3xl lg:text-4xl xl:text-5xl"
              aria-live="polite"
            >
              {month} <span className="text-neutral-300">{year}</span>
            </h1>
            <button
              type="button"
              onClick={onNext}
              aria-label="Next month"
              className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 sm:hidden', focusRing)}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
          <div className="hidden items-center gap-2 sm:flex">
            <PresenceBubbles viewers={viewers} />
            <div data-tour="month-nav" className="flex items-center gap-2">
              <button type="button" onClick={onToday} className={`${outlineBtn} rounded-xl px-3 lg:px-4`}>
                Today
              </button>
              <div className="flex">
                <button type="button" onClick={onPrev} aria-label="Previous month" className={`${outlineBtn} w-10 rounded-l-xl lg:w-11`}>
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  aria-label="Next month"
                  className={`${outlineBtn} -ml-px w-10 rounded-r-xl lg:w-11`}
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            </div>
            {onImport && (
              <button
                type="button"
                onClick={onImport}
                aria-label="Import from portal"
                data-tour="import"
                className={`${outlineBtn} whitespace-nowrap rounded-xl px-3 lg:px-4`}
              >
                <span className="lg:hidden">Import</span>
                <span className="hidden lg:inline">Import from portal</span>
              </button>
            )}
            <button
              type="button"
              onClick={onAdd}
              data-tour="add-show"
              className="inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-xl bg-neutral-900 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 lg:px-4"
            >
              <Plus className="size-4" aria-hidden />
              Add show
            </button>
          </div>
          <HelpMenu onTour={onTour} onFaq={onFaq} onImport={onImport} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div
          role="group"
          aria-label="Calendar view"
          data-tour="view-toggle"
          className="flex w-full rounded-xl border border-neutral-200 bg-white p-0.5 text-sm font-medium sm:w-auto"
        >
          {(['calendar', 'table', 'venues'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              aria-pressed={view === v}
              className={cn(
                'flex-1 rounded-[0.6rem] px-3.5 py-2.5 text-center capitalize transition-colors sm:flex-none sm:py-2',
                focusRing,
                view === v ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50',
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div
          role="group"
          aria-label="Region filter"
          data-tour="region-filter"
          className="hidden rounded-xl border border-neutral-200 bg-white p-0.5 text-sm font-medium sm:flex"
        >
          {(['All', ...REGIONS] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onRegionChange(value)}
              aria-pressed={region === value}
              className={cn(
                'rounded-[0.6rem] px-2.5 py-2 transition-colors',
                focusRing,
                region === value ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50',
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:hidden">
        <select
          aria-label="Region filter"
          data-tour="region-filter"
          value={region}
          onChange={(e) => onRegionChange(e.target.value as Region | 'All')}
          className={cn('h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800', focusRing)}
        >
          <option value="All">All regions</option>
          {REGIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button type="button" onClick={onToday} data-tour="month-nav" className={`${outlineBtn} shrink-0 rounded-xl px-4`}>
          Today
        </button>
      </div>

      <button
        type="button"
        onClick={onAdd}
        data-tour="add-show"
        aria-label="Add show"
        className="fixed bottom-5 right-5 z-30 inline-flex size-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 sm:hidden"
      >
        <Plus className="size-6" aria-hidden />
      </button>
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
      <div data-tour="sync-status" className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
