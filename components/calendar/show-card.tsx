import { ClipboardList, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, statusLabel, type Show } from '@/lib/shows'
import { confirmedLabel, confirmedTotal, paceTag, projectedTotal, type PortalMatch } from '@/lib/portal'
import { cardMoney, isLocalProducer, type CardMoney } from '@/lib/revenue'
import { CATEGORY_STYLES } from './category-styles'

type Props = {
  show: Show
  onOpen: (show: Show) => void
  match?: PortalMatch
  past?: boolean
  emphasis?: 'on' | 'off'
}

type CardTag = 'Sellout likely' | 'Behind' | 'Ahead' | 'LP'

const TAG_STYLES: Record<CardTag, string> = {
  'Sellout likely': 'bg-amber-100 text-amber-800',
  Behind: 'bg-red-100 text-red-700',
  Ahead: 'bg-emerald-100 text-emerald-700',
  LP: 'bg-neutral-900/10 text-neutral-700',
}

// One tag per card, in priority order: Sellout likely, Behind, Ahead, LP.
function pickTag(match: PortalMatch | undefined, past: boolean, flat: boolean, local: boolean): CardTag | null {
  const projection = match?.projection
  if (!past && !flat && !local && projection) {
    if (projection.selloutLikely) return 'Sellout likely'
    const pace = paceTag(projection.paceLabel)
    if (pace) return pace
  }
  return local ? 'LP' : null
}

function TicketsLine({ match, past, className }: { match: PortalMatch; past: boolean; className: string }) {
  if (past) {
    if (!match.hasEvent) return null
    return <span className={cn('mt-0.5 block text-[11px] leading-snug tabular-nums', className)}>{confirmedLabel(match)}</span>
  }

  const projection = match.projection
  const projected = projection ? projectedTotal(projection) : null
  if (!match.hasEvent && projected == null) return null

  const capacity = match.ticketsAvailable
  const percent = capacity ? Math.min(100, Math.round(((confirmedTotal(match) ?? 0) / capacity) * 100)) : null
  const lowConfidence = projection?.confidence === 'low'

  return (
    <span className={cn('mt-1 flex items-center gap-2 text-[11px] leading-snug tabular-nums', className)}>
      {percent != null && (
        <span aria-hidden className="h-1 min-w-4 flex-1 overflow-hidden rounded-full bg-current/15">
          <span className="block h-full rounded-full bg-current opacity-70" style={{ width: `${percent}%` }} />
        </span>
      )}
      <span className="shrink-0">
        {match.hasEvent && confirmedLabel(match)}
        {projected != null && (
          <span className={cn(lowConfidence && 'opacity-70')}>
            {match.hasEvent && ' → '}~{Math.round(projected)}
          </span>
        )}
      </span>
    </span>
  )
}

// Real money (actual, in, flat fee) is normal weight; anything projected or planned is lighter and marked with "~".
const ESTIMATE = 'opacity-60'

function MoneyLine({ money, className }: { money: CardMoney; className: string }) {
  return (
    <span className={cn('mt-0.5 flex flex-wrap items-baseline gap-x-1 text-[11px] leading-snug tabular-nums', className)}>
      {money.kind === 'actual' && <span>{formatCurrency(money.amount)}</span>}
      {money.kind === 'flat' && <span>{formatCurrency(money.amount)} flat fee</span>}
      {money.kind === 'plan' && <span className={ESTIMATE}>~{formatCurrency(money.amount)} plan</span>}
      {money.kind === 'linked' && (
        <>
          {money.sold != null && <span>{formatCurrency(money.sold)} in</span>}
          {money.sold != null && money.projected > 0 && <span className={ESTIMATE}>·</span>}
          {money.projected > 0 && <span className={ESTIMATE}>~{formatCurrency(money.projected)} proj</span>}
        </>
      )}
    </span>
  )
}

export function ShowCard({ show, onOpen, match, past = false, emphasis }: Props) {
  const styles = CATEGORY_STYLES[show.category]
  const cancelled = show.status === 'Cancelled'
  const solid = show.status === 'Confirmed'
  const flat = show.revenueType === 'Flat fee'
  const local = isLocalProducer(show)
  const money = cardMoney(show, match, past)
  const tag = pickTag(match, past, flat, local)
  const venueName = show.venue || show.area || 'Venue TBD'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen(show)
      }}
      aria-label={`${show.format}${show.venue ? ` at ${show.venue}` : ''}, ${statusLabel(show.status)}. Edit show`}
      className={cn(
        'block w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1',
        styles.card,
        solid ? 'border-solid' : 'border-dashed',
        cancelled && 'line-through opacity-45',
        emphasis === 'on' && 'ring-2 ring-neutral-900 ring-offset-1',
        emphasis === 'off' && 'opacity-30',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={cn('truncate text-sm font-semibold leading-snug', !show.venue && 'font-normal opacity-60')}>
          {venueName}
        </span>
        {tag && (
          <span className={cn('shrink-0 rounded-sm px-1 text-[10px] font-semibold leading-tight', TAG_STYLES[tag])}>
            {tag}
          </span>
        )}
      </span>
      <span className={cn('flex items-center gap-1.5 text-xs leading-snug', styles.sub)}>
        <span className={cn('size-2 shrink-0 rounded-full', styles.dot)} aria-hidden />
        <span className="truncate">
          {show.format}
          {show.region !== 'LA' && <span className="text-[11px] opacity-75"> · {show.region}</span>}
        </span>
        {show.merch && (
          <span className="shrink-0" title="Merch">
            <ShoppingBag className="size-3" aria-hidden />
            <span className="sr-only">Merch</span>
          </span>
        )}
        {show.eventPlanner && (
          <span className="shrink-0" title="Event planner">
            <ClipboardList className="size-3" aria-hidden />
            <span className="sr-only">Event planner</span>
          </span>
        )}
      </span>
      {!flat && !local && match && <TicketsLine match={match} past={past} className={styles.sub} />}
      {money && <MoneyLine money={money} className={styles.sub} />}
    </button>
  )
}
