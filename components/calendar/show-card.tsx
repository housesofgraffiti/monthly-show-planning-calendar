import { ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, statusLabel, type Show } from '@/lib/shows'
import { paceTag, soldLabel, type PortalMatch } from '@/lib/portal'
import { cardMoney, isLocalProducer, type CardMoney } from '@/lib/revenue'
import { CATEGORY_STYLES } from './category-styles'

type Props = {
  show: Show
  onOpen: (show: Show) => void
  match?: PortalMatch
  past?: boolean
  emphasis?: 'on' | 'off'
}

function PortalLine({ match, past, className }: { match: PortalMatch; past: boolean; className: string }) {
  const projection = match.projection
  if (past) {
    if (!match.hasEvent) return null
    return (
      <span className={cn('flex items-baseline justify-between gap-2 text-[11px] leading-snug tabular-nums', className)}>
        <span className="truncate">{soldLabel(match)}</span>
      </span>
    )
  }

  const tag = paceTag(projection?.paceLabel)
  const parts: React.ReactNode[] = []
  if (match.hasEvent) parts.push(soldLabel(match))
  if (projection?.tickets != null) {
    const low = projection.confidence === 'low'
    parts.push(
      <span className={cn(low && 'opacity-60')}>
        Proj. {low && '~'}
        {Math.round(projection.tickets)}
      </span>,
    )
  }
  const sellout = projection?.selloutLikely === true
  if (parts.length === 0 && !tag && !sellout) return null

  return (
    <span
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-1.5 gap-y-0.5 text-[11px] leading-snug tabular-nums',
        className,
      )}
    >
      <span className="max-w-full truncate">
        {parts.map((part, i) => (
          <span key={i}>
            {i > 0 && ' · '}
            {part}
          </span>
        ))}
      </span>
      {(tag || sellout) && (
        <span className="flex shrink-0 items-center gap-1">
          {sellout && (
            <span className="rounded-sm bg-amber-100 px-1 text-[10px] font-semibold leading-tight text-amber-800">
              Sellout likely
            </span>
          )}
          {tag && (
            <span
              className={cn(
                'rounded-sm px-1 text-[10px] font-semibold leading-tight',
                tag === 'Behind' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700',
              )}
            >
              {tag}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

// Real money (actual, sold, flat fee) is bold; anything projected or planned is lighter and marked with "~".
const REAL = 'font-semibold'
const ESTIMATE = 'font-normal opacity-60'

function MoneyLine({ money, className }: { money: CardMoney; className: string }) {
  return (
    <span
      className={cn(
        'flex flex-wrap items-baseline justify-between gap-x-2 text-[11px] leading-snug tabular-nums',
        className,
      )}
    >
      {money.kind === 'actual' && <span className={REAL}>{formatCurrency(money.amount)}</span>}
      {money.kind === 'flat' && <span className={REAL}>{formatCurrency(money.amount)} flat fee</span>}
      {money.kind === 'plan' && <span className={ESTIMATE}>~{formatCurrency(money.amount)} plan</span>}
      {money.kind === 'linked' && (
        <>
          {money.sold != null && <span className={REAL}>{formatCurrency(money.sold)} sold</span>}
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
      <span className="flex items-center gap-1.5">
        <span className="block truncate text-sm font-medium leading-snug">{show.format}</span>
        {local && (
          <span className="shrink-0 rounded-sm bg-neutral-900/10 px-1 text-[10px] font-semibold leading-tight text-neutral-700">
            LP
          </span>
        )}
        {show.merch && (
          <span className="shrink-0" title="Merch">
            <ShoppingBag className="size-3" aria-hidden />
            <span className="sr-only">Merch</span>
          </span>
        )}
      </span>
      <span className={cn('flex items-baseline justify-between gap-2 text-xs leading-snug', styles.sub)}>
        <span className="truncate">
          {show.venue || show.area || '\u00A0'}
          {show.region !== 'LA' && <span className="text-[11px] opacity-75"> · {show.region}</span>}
        </span>
      </span>
      {money && <MoneyLine money={money} className={cn('mt-0.5', styles.sub)} />}
      {!flat && !local && match && <PortalLine match={match} past={past} className={cn('mt-0.5', styles.sub)} />}
    </button>
  )
}
