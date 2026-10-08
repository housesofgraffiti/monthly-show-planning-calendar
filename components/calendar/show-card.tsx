import { ClipboardList, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatLongDate } from '@/lib/dates'
import { formatCurrency, statusLabel, type Show } from '@/lib/shows'
import {
  capitalize,
  compCount,
  confirmedLabel,
  confirmedTotal,
  paceTag,
  projectedRange,
  projectedTotal,
  type PortalMatch,
} from '@/lib/portal'
import { cardMoney, isLocalProducer, type CardMoney } from '@/lib/revenue'
import { activeAdjustment } from '@/lib/adjustments'
import { decideBySource, formatDayShort, type DecideBy } from '@/lib/sends'
import { CATEGORY_STYLES } from './category-styles'

type Props = {
  show: Show
  onOpen: (show: Show) => void
  match?: PortalMatch
  past?: boolean
  emphasis?: 'on' | 'off'
  decideBy?: DecideBy | null
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

function hasTicketsLine(match: PortalMatch, past: boolean) {
  if (past) return match.hasEvent
  return match.hasEvent || (match.projection != null && projectedTotal(match.projection) != null)
}

function isUpcomingWithin14Days(date: string) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const days = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
  return days >= 0 && days <= 14
}

function Tag({ tag }: { tag: CardTag }) {
  return (
    <span className={cn('shrink-0 whitespace-normal break-words rounded-sm px-1 text-[10px] font-semibold leading-tight', TAG_STYLES[tag])}>
      {tag}
    </span>
  )
}

function TicketsLine({
  show,
  match,
  past,
  className,
}: {
  show: Show
  match: PortalMatch
  past: boolean
  className: string
}) {
  if (!hasTicketsLine(match, past)) return null
  if (past) {
    return <span className={cn('mt-0.5 block text-[11px] leading-snug tabular-nums', className)}>{confirmedLabel(match)}</span>
  }

  const projection = match.projection
  const adjusted = activeAdjustment(show, past)
  const projected = adjusted ?? (projection ? projectedTotal(projection) : null)
  const capacity = match.ticketsAvailable
  const percent = capacity ? Math.min(100, Math.round(((confirmedTotal(match) ?? 0) / capacity) * 100)) : null
  const lowConfidence = adjusted == null && projection?.confidence === 'low'

  return (
    <span className={cn('mt-1 block text-[11px] leading-snug tabular-nums', className)}>
      {percent != null && (
        <span aria-hidden className="block h-1 w-full overflow-hidden rounded-full bg-current/15">
          <span className="block h-full rounded-full bg-current opacity-70" style={{ width: `${percent}%` }} />
        </span>
      )}
      <span className="mt-0.5 block whitespace-normal break-words">
        {match.hasEvent && confirmedLabel(match)}
        {projected != null && (
          <span className={cn(lowConfidence && 'opacity-70')}>
            {match.hasEvent && ' → '}~{Math.round(projected)}
            {adjusted != null && ' adj'}
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

function PreviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
      <dt className="font-medium text-neutral-500">{label}</dt>
      <dd className="min-w-0 whitespace-normal break-words text-neutral-900">{children}</dd>
    </div>
  )
}

function HoverPreview({
  show,
  match,
  past,
  decideBy,
}: {
  show: Show
  match?: PortalMatch
  past: boolean
  decideBy?: DecideBy | null
}) {
  const projection = match?.projection
  const range = projection ? projectedRange(projection) : null
  const confirmed = match ? confirmedTotal(match) : null
  const comps = match ? compCount(match) : 0
  const revenue = cardMoney(show, match, past)
  const revenueText =
    revenue?.kind === 'flat'
      ? `${formatCurrency(revenue.amount)} flat fee`
      : revenue?.kind === 'plan'
        ? `~${formatCurrency(revenue.amount)} plan`
        : revenue?.kind === 'actual'
          ? `${formatCurrency(revenue.amount)} in`
          : revenue?.kind === 'linked'
            ? `${revenue.sold != null ? `${formatCurrency(revenue.sold)} in` : ''}${revenue.sold != null && revenue.projected > 0 ? ' · ' : ''}${revenue.projected > 0 ? `~${formatCurrency(revenue.projected)} proj` : ''}`
            : null

  return (
    <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-72 rounded-lg border border-neutral-300 bg-background p-3 text-[11px] leading-snug text-foreground opacity-0 shadow-lg transition-opacity delay-500 duration-150 group-hover:block group-hover:opacity-100 md:block">
      <dl className="flex flex-col gap-1.5">
        <PreviewRow label="Venue">{show.venue || show.area || 'Venue TBD'}</PreviewRow>
        <PreviewRow label="Date">{formatLongDate(show.date)}</PreviewRow>
        <PreviewRow label="Format">{show.format}</PreviewRow>
        <PreviewRow label="Status">{statusLabel(show.status)}</PreviewRow>
        <PreviewRow label="Organized by">{show.organizedBy}</PreviewRow>
        <PreviewRow label="Region">{show.region}</PreviewRow>
        {decideBy && (
          <PreviewRow label="Decide by">
            {formatDayShort(decideBy.date)} · {decideBySource(decideBy)}
          </PreviewRow>
        )}
        {match?.hasEvent && (
          <PreviewRow label="Tickets">
            {confirmed ?? 0} / {match.ticketsAvailable ?? '—'} ({Math.max(0, (confirmed ?? 0) - comps)} paid, {comps} comp)
            {match.vips ? ` · ${match.vips} VIPs` : ''}
          </PreviewRow>
        )}
        {projection && (
          <PreviewRow label={show.adjustedTotal != null ? 'Model' : 'Projection'}>
            {projectedTotal(projection) != null ? `~${Math.round(projectedTotal(projection)!)}` : '—'}
            {range ? ` (${Math.round(range[0])} to ${Math.round(range[1])})` : ''}
            {projection.confidence ? ` · ${capitalize(projection.confidence)}` : ''}
            {projection.paceLabel ? ` · ${capitalize(projection.paceLabel)}` : ''}
          </PreviewRow>
        )}
        {show.adjustedTotal != null && (
          <PreviewRow label="Your estimate">
            ~{show.adjustedTotal}
            {show.adjustmentReason ? ` · ${show.adjustmentReason}` : ''}
            {show.modelTotalAtAdjustment != null ? ` · model was ~${show.modelTotalAtAdjustment}` : ''}
            {show.adjustmentNote.trim() ? ` · ${show.adjustmentNote.trim()}` : ''}
          </PreviewRow>
        )}
        {revenueText && <PreviewRow label="Revenue">{revenueText}</PreviewRow>}
        {match?.ticketPrices && <PreviewRow label="Prices">{match.ticketPrices}</PreviewRow>}
        {match?.ticketMix && <PreviewRow label="Mix">{match.ticketMix}</PreviewRow>}
        <PreviewRow label="Merchandised">{show.merchandised ? 'Merchandised' : 'Not Merchandised'}</PreviewRow>
        {show.merch && <PreviewRow label="Merch">Yes</PreviewRow>}
        {show.eventPlanner && <PreviewRow label="Event planner">Yes</PreviewRow>}
        {show.venueFee != null && <PreviewRow label="Venue fee">{formatCurrency(show.venueFee)}</PreviewRow>}
        {show.notes.trim() && <PreviewRow label="Notes">{show.notes.split(/\\r?\\n/, 1)[0]}</PreviewRow>}
      </dl>
    </div>
  )
}

export function ShowCard({ show, onOpen, match, past = false, emphasis, decideBy }: Props) {
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
        'group relative block w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1',
        styles.card,
        solid ? 'border-solid' : 'border-dashed',
        cancelled && 'line-through opacity-45',
        emphasis === 'on' && 'ring-2 ring-neutral-900 ring-offset-1',
        emphasis === 'off' && 'opacity-30',
      )}
    >
      <span className={cn('block text-sm font-semibold leading-snug', !show.venue && 'font-normal opacity-60')}>
        {venueName}
      </span>
      <span className={cn('flex items-center gap-1.5 text-xs leading-snug', styles.sub)}>
        <span className={cn('size-2 shrink-0 rounded-full', styles.dot)} aria-hidden />
        <span className="min-w-0 whitespace-normal break-words">
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
      {!flat && !local && match && <TicketsLine show={show} match={match} past={past} className={styles.sub} />}
      {money && <MoneyLine money={money} className={styles.sub} />}
      {isUpcomingWithin14Days(show.date) && !show.merchandised && (
        <span className="mt-1 block text-[10px] leading-snug text-neutral-500">Not Merchandised</span>
      )}
      {tag && (
        <span className={cn('mt-1 flex justify-end', styles.sub)}>
          <Tag tag={tag} />
        </span>
      )}
      <HoverPreview show={show} match={match} past={past} decideBy={decideBy} />
    </button>
  )
}
