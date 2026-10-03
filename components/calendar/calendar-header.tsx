import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { monthTitle } from '@/lib/dates'
import { CATEGORIES } from '@/lib/shows'
import { CATEGORY_STYLES } from './category-styles'

type View = 'calendar' | 'table'

type HeaderProps = {
  ym: string
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  onAdd: () => void
  view: View
  onViewChange: (view: View) => void
}

const outlineBtn =
  'inline-flex h-11 items-center justify-center border border-neutral-200 bg-white text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900'

export function CalendarHeader({ ym, onToday, onPrev, onNext, onAdd, view, onViewChange }: HeaderProps) {
  const { month, year } = monthTitle(ym)
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          Sofar Sounds LA · Show Calendar
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl" aria-live="polite">
          {month} <span className="text-neutral-300">{year}</span>
        </h1>
      </div>
      <div className="flex items-center gap-2.5">
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

export function Legend({ syncing }: { syncing: boolean }) {
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
          Confirmed
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-5 rounded border border-dashed border-neutral-400" aria-hidden />
          Idea / Tentative
        </li>
        <li className="text-neutral-400 line-through">Cancelled</li>
      </ul>
      <p className="text-neutral-500" aria-live="polite">
        {syncing ? 'Syncing…' : 'Syncs every 30s'}
      </p>
    </div>
  )
}
