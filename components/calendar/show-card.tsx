import { cn } from '@/lib/utils'
import { formatCompact, type Show } from '@/lib/shows'
import { paceTag, soldLabel, type PortalMatch } from '@/lib/portal'
import { CATEGORY_STYLES } from './category-styles'

type Props = {
  show: Show
  onOpen: (show: Show) => void
  match?: PortalMatch
  past?: boolean
}

function PortalLine({ match, past, className }: { match: PortalMatch; past: boolean; className: string }) {
  const projection = match.projection
  if (past) {
    if (!match.hasEvent) return null
    return (
      <span className={cn('flex items-baseline justify-between gap-2 text-[11px] leading-snug tabular-nums', className)}>
        <span className="truncate">{soldLabel(match)}</span>
        {match.revenue != null && <span className="shrink-0 font-medium">{formatCompact(match.revenue)}</span>}
      </span>
    )
  }

  const tag = paceTag(projection?.paceLabel)
  const parts: React.ReactNode[] = []
  if (match.hasEvent) parts.push(soldLabel(match))
  if (projection?.tickets != null) {
    parts.push(
      <>
        Proj. {Math.round(projection.tickets)}
        {projection.confidence === 'low' && (
          <span className="opacity-70" title="Low confidence">
            ?
          </span>
        )}
      </>,
    )
  }
  if (parts.length === 0 && !tag) return null

  return (
    <span className={cn('flex items-center justify-between gap-1.5 text-[11px] leading-snug tabular-nums', className)}>
      <span className="truncate">
        {parts.map((part, i) => (
          <span key={i}>
            {i > 0 && ' · '}
            {part}
          </span>
        ))}
      </span>
      {tag && (
        <span
          className={cn(
            'shrink-0 rounded-sm px-1 text-[10px] font-semibold leading-tight',
            tag === 'Behind' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700',
          )}
        >
          {tag}
        </span>
      )}
    </span>
  )
}

export function ShowCard({ show, onOpen, match, past = false }: Props) {
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
      {match && <PortalLine match={match} past={past} className={cn('mt-0.5', styles.sub)} />}
    </button>
  )
}
