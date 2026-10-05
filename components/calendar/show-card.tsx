import { cn } from '@/lib/utils'
import { formatCompact, type Show } from '@/lib/shows'
import { CATEGORY_STYLES } from './category-styles'

export function ShowCard({ show, onOpen }: { show: Show; onOpen: (show: Show) => void }) {
  const styles = CATEGORY_STYLES[show.category]
  const cancelled = show.status === 'Cancelled'
  const solid = show.status === 'Confirmed'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen(show)
      }}
      aria-label={`${show.format}${show.venue ? ` at ${show.venue}` : ''}, ${show.status}. Edit show`}
      className={cn(
        'block w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1',
        styles.card,
        solid ? 'border-solid' : 'border-dashed',
        cancelled && 'line-through opacity-45',
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className="block truncate text-sm font-medium leading-snug">{show.format}</span>
        {show.organizedBy === 'Local Producer' && (
          <span className="shrink-0 rounded-sm bg-neutral-900/10 px-1 text-[10px] font-semibold leading-tight text-neutral-700">
            LP
          </span>
        )}
      </span>
      <span className={cn('flex items-baseline justify-between gap-2 text-xs leading-snug', styles.sub)}>
        <span className="truncate">
          {show.venue || show.area || '\u00A0'}
          {show.region !== 'LA' && <span className="text-[11px] opacity-75"> · {show.region}</span>}
        </span>
        {show.projectedRevenue != null && show.projectedRevenue > 0 && (
          <span className="shrink-0 tabular-nums">{formatCompact(show.projectedRevenue)}</span>
        )}
      </span>
    </button>
  )
}
