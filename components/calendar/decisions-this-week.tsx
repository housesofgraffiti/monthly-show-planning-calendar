import { cn } from '@/lib/utils'
import type { Show } from '@/lib/shows'
import { confirmedLabel, paceTag, portalFor, projectedTotal, type PortalMap } from '@/lib/portal'
import { activeAdjustment } from '@/lib/adjustments'
import { decideBySource, formatDayShort, type Decision } from '@/lib/sends'

type Props = {
  decisions: Decision[]
  portal?: PortalMap
  onOpen: (show: Show) => void
}

export function DecisionsThisWeek({ decisions, portal, onOpen }: Props) {
  if (decisions.length === 0) return null
  return (
    <section aria-label="Decisions this week" data-tour="decisions" className="rounded-2xl border border-teal-200 bg-teal-50/50 px-4 py-3">
      <h2 className="text-sm font-semibold text-neutral-900">
        Decisions this week <span className="font-normal text-neutral-500">· {decisions.length}</span>
      </h2>
      <ul className="mt-1.5 flex flex-col divide-y divide-teal-100">
        {decisions.map(({ show, decideBy }) => {
          const match = portalFor(show, portal)
          const adjusted = activeAdjustment(show, false)
          const projected = adjusted ?? (match?.projection ? projectedTotal(match.projection) : null)
          const pace = paceTag(match?.projection?.paceLabel)
          return (
            <li key={show.id}>
              <button
                type="button"
                onClick={() => onOpen(show)}
                aria-label={`Open ${show.venue || show.format}, decide by ${formatDayShort(decideBy.date)}`}
                className="flex min-h-11 w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg px-1 py-2.5 text-left text-sm transition-colors hover:bg-teal-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              >
                <span className="font-semibold text-teal-800">Decide by {formatDayShort(decideBy.date)}</span>
                <span className="font-medium text-neutral-900">{show.venue || show.area || 'Venue TBD'}</span>
                <span className="tabular-nums text-neutral-600">{formatDayShort(show.date)}</span>
                <span className="tabular-nums text-neutral-600">
                  {match?.hasEvent ? confirmedLabel(match) : 'No sales yet'}
                </span>
                {projected != null && (
                  <span className="tabular-nums text-neutral-600">
                    ~{Math.round(projected)} proj{adjusted != null && ' adj'}
                  </span>
                )}
                {pace && (
                  <span
                    className={cn(
                      'rounded-sm px-1 text-[10px] font-semibold leading-tight',
                      pace === 'Behind' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700',
                    )}
                  >
                    {pace}
                  </span>
                )}
                <span className="text-xs text-neutral-500">{decideBySource(decideBy)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
