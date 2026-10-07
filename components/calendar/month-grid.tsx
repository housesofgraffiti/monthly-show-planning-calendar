import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildMonthGrid, formatLongDate, formatShortWeekday, WEEKDAYS } from '@/lib/dates'
import type { Show } from '@/lib/shows'
import { isPastShow, portalFor, type PortalMap } from '@/lib/portal'
import { markersByDate, type DayMarker } from '@/lib/markers'
import { ShowCard } from './show-card'

type Props = {
  ym: string
  todayISO: string
  shows: Show[]
  portal?: PortalMap
  markers: DayMarker[]
  onAdd: (date: string) => void
  onOpen: (show: Show) => void
}

function MarkerBanners({ markers }: { markers: DayMarker[] | undefined }) {
  if (!markers?.length) return null
  return (
    <div className="flex flex-col gap-0.5">
      {markers.map((m) => (
        <span
          key={m.id}
          title={m.note || m.label}
          className={cn(
            'truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight',
            m.type === 'event' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-500',
          )}
        >
          {m.label}
        </span>
      ))}
    </div>
  )
}

function groupByDate(shows: Show[]) {
  const map = new Map<string, Show[]>()
  for (const show of shows) {
    const list = map.get(show.date) ?? []
    list.push(show)
    map.set(show.date, list)
  }
  return map
}

function DayNumber({ day, isToday, muted }: { day: number; isToday: boolean; muted?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-full text-sm tabular-nums',
        isToday ? 'bg-neutral-900 font-semibold text-white' : muted ? 'text-neutral-300' : 'text-neutral-700',
      )}
    >
      {day}
    </span>
  )
}

export function MonthGrid({ ym, todayISO, shows, portal, markers, onAdd, onOpen }: Props) {
  const markerMap = markersByDate(ym, markers)
  const renderCard = (show: Show) => (
    <ShowCard
      key={show.id}
      show={show}
      onOpen={onOpen}
      match={portalFor(show, portal)}
      past={isPastShow(show, todayISO)}
    />
  )
  const grid = buildMonthGrid(ym)
  const byDate = groupByDate(shows)
  const monthDays = grid.filter((d) => d.inMonth)

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 md:block">
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50/60">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((cell, i) => {
            const dayShows = byDate.get(cell.iso) ?? []
            const isToday = cell.iso === todayISO
            const lastCol = i % 7 === 6
            const lastRow = i >= grid.length - 7

            if (!cell.inMonth) {
              return (
                <div
                  key={cell.iso}
                  className={cn(
                    'min-h-36 bg-neutral-50/70 p-2',
                    !lastCol && 'border-r border-neutral-100',
                    !lastRow && 'border-b border-neutral-100',
                  )}
                >
                  <DayNumber day={cell.day} isToday={false} muted />
                </div>
              )
            }

            return (
              <div
                key={cell.iso}
                onClick={() => onAdd(cell.iso)}
                className={cn(
                  'group relative flex min-h-36 cursor-pointer flex-col gap-1.5 p-2 transition-colors hover:bg-neutral-50',
                  !lastCol && 'border-r border-neutral-100',
                  !lastRow && 'border-b border-neutral-100',
                )}
              >
                <MarkerBanners markers={markerMap.get(cell.iso)} />
                <div className="flex items-center justify-between">
                  <DayNumber day={cell.day} isToday={isToday} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAdd(cell.iso)
                    }}
                    aria-label={`Add show on ${formatLongDate(cell.iso)}`}
                    className="inline-flex size-6 items-center justify-center rounded-md text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-200/60 hover:text-neutral-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 group-hover:opacity-100"
                  >
                    <Plus className="size-4" aria-hidden />
                  </button>
                </div>
                {dayShows.map(renderCard)}
              </div>
            )
          })}
        </div>
      </div>

      <ol className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 md:hidden">
        {monthDays.map((cell) => {
          const dayShows = byDate.get(cell.iso) ?? []
          const isToday = cell.iso === todayISO
          return (
            <li key={cell.iso} className="flex gap-3 p-3">
              <div className="flex w-10 shrink-0 flex-col items-center gap-0.5 pt-0.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  {formatShortWeekday(cell.iso)}
                </span>
                <DayNumber day={cell.day} isToday={isToday} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <MarkerBanners markers={markerMap.get(cell.iso)} />
                {dayShows.map(renderCard)}
                <button
                  type="button"
                  onClick={() => onAdd(cell.iso)}
                  aria-label={`Add show on ${formatLongDate(cell.iso)}`}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg text-left text-sm text-neutral-400 hover:text-neutral-700',
                    dayShows.length ? 'px-1 py-0.5 text-xs' : 'min-h-9 px-1',
                  )}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add show
                </button>
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}
