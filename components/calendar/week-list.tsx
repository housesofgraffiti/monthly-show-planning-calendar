import type { ReactNode } from 'react'
import { Mail, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildMonthGrid, formatLongDate, formatShortWeekday, formatWeekLabel } from '@/lib/dates'
import type { Show } from '@/lib/shows'
import type { DayMarker } from '@/lib/markers'
import { isOpenNight } from '@/lib/planning'
import type { Send } from '@/lib/sends'
import { SendChips } from './send-chips'
import { DayNumber, groupByDate, MarkerBanners, OpenLabel } from './day-parts'

type Props = {
  ym: string
  todayISO: string
  shows: Show[]
  markerMap: Map<string, DayMarker[]>
  sendMap: Map<string, Send[]>
  renderCard: (show: Show) => ReactNode
  onAdd: (date: string) => void
  onAddSend: (date: string) => void
  onOpenSend: (send: Send) => void
}

const addLink = 'flex items-center gap-1.5 rounded-lg px-1 py-1.5 text-left text-xs text-neutral-500 hover:text-neutral-800'

export function WeekList({ ym, todayISO, shows, markerMap, sendMap, renderCard, onAdd, onAddSend, onOpenSend }: Props) {
  const grid = buildMonthGrid(ym)
  const byDate = groupByDate(shows)
  const weeks = Array.from({ length: grid.length / 7 }, (_, i) => grid.slice(i * 7, i * 7 + 7))

  return (
    <ol className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200">
      {weeks.map((week, weekIndex) => {
        const days = week
          .filter((cell) => cell.inMonth)
          .map((cell) => {
            const dayShows = byDate.get(cell.iso) ?? []
            const markers = markerMap.get(cell.iso)
            const sends = sendMap.get(cell.iso)
            return {
              cell,
              dayShows,
              markers,
              sends,
              open: isOpenNight(cell.iso, dayShows, todayISO),
              hasContent: dayShows.length > 0 || Boolean(markers?.length) || Boolean(sends?.length),
            }
          })
          .filter((day) => day.hasContent || day.open)

        return (
          <li
            key={week[0].iso}
            className={cn(weekIndex > 0 && 'border-t border-neutral-300/70', weekIndex % 2 === 1 && 'bg-neutral-50/70')}
          >
            <h3 className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              {formatWeekLabel(week[0].iso)}
            </h3>
            {days.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-neutral-400">Nothing scheduled.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100">
                {days.map(({ cell, dayShows, markers, sends, open }) => (
                  <li
                    key={cell.iso}
                    data-tour={open ? 'open-night' : undefined}
                    className={cn('flex gap-3 px-3 py-3', open && 'bg-sky-50/70')}
                  >
                    <div className="flex w-10 shrink-0 flex-col items-center gap-0.5 pt-0.5">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                        {formatShortWeekday(cell.iso)}
                      </span>
                      <DayNumber day={cell.day} isToday={cell.iso === todayISO} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <MarkerBanners markers={markers} />
                      <SendChips sends={sends} onOpen={onOpenSend} />
                      {dayShows.map(renderCard)}
                      {open && <OpenLabel className="px-1" />}
                      <div className="flex flex-wrap items-center gap-x-4">
                        <button
                          type="button"
                          onClick={() => onAdd(cell.iso)}
                          aria-label={`Add show on ${formatLongDate(cell.iso)}`}
                          className={addLink}
                        >
                          <Plus className="size-3.5" aria-hidden />
                          Add show
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddSend(cell.iso)}
                          aria-label={`Add send on ${formatLongDate(cell.iso)}`}
                          className={addLink}
                        >
                          <Mail className="size-3.5" aria-hidden />
                          Add send
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  )
}
