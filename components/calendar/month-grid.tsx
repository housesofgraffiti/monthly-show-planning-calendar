'use client'

import { useEffect, useState } from 'react'
import { Mail, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildMonthGrid, formatLongDate, WEEKDAYS } from '@/lib/dates'
import type { Show } from '@/lib/shows'
import { isPastShow, portalFor, type PortalMap } from '@/lib/portal'
import { markersByDate, type DayMarker } from '@/lib/markers'
import { isOpenNight, matchesMix, type MixKey } from '@/lib/planning'
import { decideByFor, sendsByDate, type Send } from '@/lib/sends'
import { SendChips } from './send-chips'
import { ShowCard } from './show-card'
import { DayNumber, groupByDate, MarkerBanners, OpenLabel } from './day-parts'
import { WeekList } from './week-list'

type Props = {
  ym: string
  todayISO: string
  shows: Show[]
  portal?: PortalMap
  markers: DayMarker[]
  sends: Send[]
  showSends: boolean
  highlight?: MixKey | null
  onAdd: (date: string) => void
  onAddSend: (date: string) => void
  onOpen: (show: Show) => void
  onOpenSend: (send: Send) => void
}

const menuItem =
  'flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900'

export function MonthGrid({
  ym,
  todayISO,
  shows,
  portal,
  markers,
  sends,
  showSends,
  highlight = null,
  onAdd,
  onAddSend,
  onOpen,
  onOpenSend,
}: Props) {
  const [menuDate, setMenuDate] = useState<string | null>(null)

  useEffect(() => {
    if (!menuDate) return
    const close = (e: PointerEvent) => {
      if (!(e.target as Element).closest('[data-add-menu]')) setMenuDate(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuDate(null)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuDate])

  const markerMap = markersByDate(ym, markers)
  const sendMap = showSends ? sendsByDate(sends) : new Map<string, Send[]>()
  const renderCard = (show: Show, previewAlign: 'left' | 'right' = 'left') => (
    <ShowCard
      key={show.id}
      show={show}
      onOpen={onOpen}
      match={portalFor(show, portal)}
      decideBy={decideByFor(show, sends, todayISO)}
      past={isPastShow(show, todayISO)}
      emphasis={highlight ? (matchesMix(show, highlight) ? 'on' : 'off') : undefined}
      previewAlign={previewAlign}
    />
  )
  const grid = buildMonthGrid(ym)
  const byDate = groupByDate(shows)

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 sm:block">
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50/60">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2.5 text-xs font-medium uppercase tracking-wider text-neutral-500 lg:px-3">
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
            const altWeek = Math.floor(i / 7) % 2 === 1
            const previewAlign = i % 7 >= 4 ? 'right' : 'left'

            if (!cell.inMonth) {
              return (
                <div
                  key={cell.iso}
                  className={cn(
                    'min-h-36 min-w-0 bg-neutral-50/70 p-2',
                    !lastCol && 'border-r border-neutral-100',
                    !lastRow && 'border-b border-neutral-300/70',
                  )}
                >
                  <DayNumber day={cell.day} isToday={false} muted />
                </div>
              )
            }

            const open = isOpenNight(cell.iso, dayShows, todayISO)

            return (
              <div
                key={cell.iso}
                data-tour={open ? 'open-night' : undefined}
                onClick={() => setMenuDate(cell.iso)}
                className={cn(
                  'group relative flex min-h-36 min-w-0 cursor-pointer flex-col gap-1.5 p-1.5 transition-colors hover:bg-neutral-100/60 lg:p-2',
                  altWeek && 'bg-neutral-50/70',
                  open && 'bg-sky-50/70 hover:bg-sky-100/60',
                  !lastCol && 'border-r border-neutral-100',
                  !lastRow && 'border-b border-neutral-300/70',
                )}
              >
                <MarkerBanners markers={markerMap.get(cell.iso)} />
                <SendChips sends={sendMap.get(cell.iso)} onOpen={onOpenSend} />
                <div className="flex items-center justify-between">
                  <DayNumber day={cell.day} isToday={isToday} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuDate(cell.iso)
                    }}
                    aria-label={`Add to ${formatLongDate(cell.iso)}`}
                    aria-haspopup="menu"
                    aria-expanded={menuDate === cell.iso}
                    className="inline-flex size-6 items-center justify-center rounded-md text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-200/60 hover:text-neutral-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 group-hover:opacity-100"
                  >
                    <Plus className="size-4" aria-hidden />
                  </button>
                </div>
                {menuDate === cell.iso && (
                  <div
                    role="menu"
                    data-add-menu
                    aria-label={`Add on ${formatLongDate(cell.iso)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-1.5 top-1.5 z-20 flex w-36 flex-col rounded-xl border border-neutral-200 bg-white p-1 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      autoFocus
                      onClick={() => {
                        setMenuDate(null)
                        onAdd(cell.iso)
                      }}
                      className={menuItem}
                    >
                      <Plus className="size-4 text-neutral-400" aria-hidden />
                      Add show
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuDate(null)
                        onAddSend(cell.iso)
                      }}
                      className={menuItem}
                    >
                      <Mail className="size-4 text-neutral-400" aria-hidden />
                      Add send
                    </button>
                  </div>
                )}
                {dayShows.map((show) => renderCard(show, previewAlign))}
                {open && <OpenLabel className="mt-auto" />}
              </div>
            )
          })}
        </div>
      </div>

      <div className="sm:hidden">
        <WeekList
          ym={ym}
          todayISO={todayISO}
          shows={shows}
          markerMap={markerMap}
          sendMap={sendMap}
          renderCard={(show) => renderCard(show)}
          onAdd={onAdd}
          onAddSend={onAddSend}
          onOpenSend={onOpenSend}
        />
      </div>
    </>
  )
}
