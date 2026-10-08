'use client'

import { useEffect, useState } from 'react'
import { Mail, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildMonthGrid, formatLongDate, formatShortWeekday, WEEKDAYS } from '@/lib/dates'
import type { Show } from '@/lib/shows'
import { isPastShow, portalFor, type PortalMap } from '@/lib/portal'
import { markersByDate, type DayMarker } from '@/lib/markers'
import { isOpenNight, matchesMix, type MixKey } from '@/lib/planning'
import { decideByFor, sendsByDate, type Send } from '@/lib/sends'
import { SendChips } from './send-chips'
import { ShowCard } from './show-card'

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

function MarkerBanners({ markers }: { markers: DayMarker[] | undefined }) {
  if (!markers?.length) return null
  return (
    <div data-tour="day-marker" className="flex flex-col gap-0.5">
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

function OpenLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn('select-none text-[11px] font-medium uppercase tracking-wider text-sky-700/70', className)}
    >
      Open<span className="sr-only"> night, no shows booked</span>
    </span>
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
  const renderCard = (show: Show) => (
    <ShowCard
      key={show.id}
      show={show}
      onOpen={onOpen}
      match={portalFor(show, portal)}
      decideBy={decideByFor(show, sends, todayISO)}
      past={isPastShow(show, todayISO)}
      emphasis={highlight ? (matchesMix(show, highlight) ? 'on' : 'off') : undefined}
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
            const altWeek = Math.floor(i / 7) % 2 === 1

            if (!cell.inMonth) {
              return (
                <div
                  key={cell.iso}
                  className={cn(
                    'min-h-36 bg-neutral-50/70 p-2',
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
                  'group relative flex min-h-36 cursor-pointer flex-col gap-1.5 p-2 transition-colors hover:bg-neutral-100/60',
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
                {dayShows.map(renderCard)}
                {open && <OpenLabel className="mt-auto" />}
              </div>
            )
          })}
        </div>
      </div>

      <ol className="flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 md:hidden">
        {monthDays.map((cell) => {
          const dayShows = byDate.get(cell.iso) ?? []
          const isToday = cell.iso === todayISO
          const open = isOpenNight(cell.iso, dayShows, todayISO)
          return (
            <li key={cell.iso} className={cn('flex gap-3 p-3', open && 'bg-sky-50/70')}>
              <div className="flex w-10 shrink-0 flex-col items-center gap-0.5 pt-0.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  {formatShortWeekday(cell.iso)}
                </span>
                <DayNumber day={cell.day} isToday={isToday} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <MarkerBanners markers={markerMap.get(cell.iso)} />
                <SendChips sends={sendMap.get(cell.iso)} onOpen={onOpenSend} />
                {dayShows.map(renderCard)}
                {open && <OpenLabel className="px-1" />}
                <div className="flex flex-wrap items-center gap-x-4">
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
                  <button
                    type="button"
                    onClick={() => onAddSend(cell.iso)}
                    aria-label={`Add send on ${formatLongDate(cell.iso)}`}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg text-left text-sm text-neutral-400 hover:text-neutral-700',
                      dayShows.length ? 'px-1 py-0.5 text-xs' : 'min-h-9 px-1',
                    )}
                  >
                    <Mail className="size-3.5" aria-hidden />
                    Add send
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}
