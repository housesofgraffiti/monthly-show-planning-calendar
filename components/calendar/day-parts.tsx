import { cn } from '@/lib/utils'
import type { Show } from '@/lib/shows'
import type { DayMarker } from '@/lib/markers'

export function MarkerBanners({ markers }: { markers: DayMarker[] | undefined }) {
  if (!markers?.length) return null
  return (
    <div data-tour="day-marker" className="flex flex-col gap-0.5">
      {markers.map((m) => (
        <span
          key={m.id}
          title={m.note || m.label}
          className={cn(
            'whitespace-normal break-words rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight',
            m.type === 'event' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-500',
          )}
        >
          {m.label}
        </span>
      ))}
    </div>
  )
}

export function OpenLabel({ className }: { className?: string }) {
  return (
    <span className={cn('select-none text-[11px] font-medium uppercase tracking-wider text-sky-700/70', className)}>
      Open<span className="sr-only"> night, no shows booked</span>
    </span>
  )
}

export function groupByDate(shows: Show[]) {
  const map = new Map<string, Show[]>()
  for (const show of shows) {
    const list = map.get(show.date) ?? []
    list.push(show)
    map.set(show.date, list)
  }
  return map
}

export function DayNumber({ day, isToday, muted }: { day: number; isToday: boolean; muted?: boolean }) {
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
