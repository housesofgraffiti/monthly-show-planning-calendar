import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatLongDate, formatShortWeekday } from '@/lib/dates'
import { formatCurrency, type Show } from '@/lib/shows'
import { capitalize, portalFor, rangeLabel, sellThrough, type PortalMap, type PortalMatch } from '@/lib/portal'
import { isFlatFee, isLocalProducer, showRevenueOn } from '@/lib/revenue'
import { CATEGORY_STYLES } from './category-styles'

type Props = {
  ym: string
  todayISO: string
  shows: Show[]
  portal?: PortalMap
  onOpen: (show: Show) => void
}

const EMPTY_CELLS = {
  sold: '',
  sellThrough: '',
  actualRev: null as number | null,
  projTickets: null as number | null,
  projRange: '',
  projRev: null as number | null,
  revRange: '',
  confidence: '',
  sellout: '',
  pace: '',
}

function portalCells(show: Show, m: PortalMatch | undefined) {
  if (isFlatFee(show)) return EMPTY_CELLS
  const p = m?.projection
  const st = m ? sellThrough(m) : null
  const revenueOnly = isLocalProducer(show)
  return {
    sold: !revenueOnly && m?.hasEvent ? `${m.confirmed ?? 0}/${m.ticketsAvailable ?? ''}` : '',
    sellThrough: revenueOnly || st == null ? '' : `${Math.round(st * 100)}%`,
    actualRev: m?.hasEvent && m.revenue != null ? m.revenue : null,
    projTickets: !revenueOnly && p?.tickets != null ? Math.round(p.tickets) : null,
    projRange: !revenueOnly && p ? (rangeLabel(p, '–') ?? '') : '',
    projRev: p?.revenue != null ? p.revenue : null,
    revRange:
      p?.revenueLow != null && p.revenueHigh != null
        ? `${formatCurrency(p.revenueLow)} – ${formatCurrency(p.revenueHigh)}`
        : '',
    confidence: !revenueOnly && p?.confidence ? capitalize(p.confidence) : '',
    sellout: !revenueOnly && p?.selloutLikely ? 'Yes' : '',
    pace: !revenueOnly && p?.paceLabel ? capitalize(p.paceLabel) : '',
  }
}

function csvCell(value: string | number) {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv(ym: string, todayISO: string, shows: Show[], portal: PortalMap | undefined) {
  const headers = [
    'Date',
    'Day',
    'Category',
    'Format',
    'Region',
    'Organized By',
    'Area',
    'Venue',
    'Revenue Type',
    'Venue Fee',
    'Merch',
    'Flat Fee',
    'Tickets',
    'Price',
    'Proj. Revenue',
    'Revenue',
    'Status',
    'Sold',
    'Sell-through %',
    'Actual Rev',
    'Proj. Tickets',
    'Proj. Range',
    'Proj. Rev',
    'Rev. Range',
    'Confidence',
    'Sellout',
    'Pace',
  ]
  const rows = shows.map((s) => {
    const c = portalCells(s, portalFor(s, portal))
    const flat = isFlatFee(s)
    return [
    s.date,
    formatShortWeekday(s.date),
    s.category,
    s.format,
    s.region,
    s.organizedBy,
    s.area,
    s.venue,
    s.revenueType,
    s.venueFee ?? '',
    s.merch ? 'Yes' : 'No',
    s.flatFee ?? '',
    flat ? '' : (s.tickets ?? ''),
    flat ? '' : (s.ticketPrice ?? ''),
    flat ? '' : (s.projectedRevenue ?? ''),
    showRevenueOn(s, portal, todayISO),
    s.status,
    c.sold,
    c.sellThrough,
    c.actualRev ?? '',
    c.projTickets ?? '',
    c.projRange,
    c.projRev ?? '',
    c.revRange,
    c.confidence,
    c.sellout,
    c.pace,
    ]
  })
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shows-${ym}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const th = 'px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500'
const td = 'px-3 py-2.5 align-top'

export function TableView({ ym, todayISO, shows, portal, onOpen }: Props) {
  const sorted = [...shows].sort((a, b) => a.date.localeCompare(b.date))
  const active = sorted.filter((s) => s.status !== 'Cancelled')
  const totalTickets = active.reduce((sum, s) => sum + (isFlatFee(s) ? 0 : (s.tickets ?? 0)), 0)
  const totalRevenue = active.reduce((sum, s) => sum + showRevenueOn(s, portal, todayISO), 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => exportCsv(ym, todayISO, sorted, portal)}
          disabled={sorted.length === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200">
        <table className="w-full min-w-[2600px] border-collapse text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50/60">
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Day</th>
              <th className={th}>Category</th>
              <th className={th}>Format</th>
              <th className={th}>Region</th>
              <th className={th}>Organized By</th>
              <th className={th}>Area</th>
              <th className={th}>Venue</th>
              <th className={th}>Revenue Type</th>
              <th className={cn(th, 'text-right')}>Venue Fee</th>
              <th className={th}>Merch</th>
              <th className={cn(th, 'text-right')}>Flat Fee</th>
              <th className={cn(th, 'text-right')}>Tickets</th>
              <th className={cn(th, 'text-right')}>Price</th>
              <th className={cn(th, 'text-right')}>Proj. Revenue</th>
              <th className={cn(th, 'text-right')}>Revenue</th>
              <th className={th}>Status</th>
              <th className={cn(th, 'text-right')}>Sold</th>
              <th className={cn(th, 'text-right')}>Sell-through %</th>
              <th className={cn(th, 'text-right')}>Actual Rev</th>
              <th className={cn(th, 'text-right')}>Proj. Tickets</th>
              <th className={cn(th, 'text-right')}>Proj. Range</th>
              <th className={cn(th, 'text-right')}>Proj. Rev</th>
              <th className={cn(th, 'text-right')}>Rev. Range</th>
              <th className={th}>Confidence</th>
              <th className={th}>Sellout</th>
              <th className={th}>Pace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={27} className="px-3 py-10 text-center text-neutral-400">
                  No shows this month.
                </td>
              </tr>
            )}
            {sorted.map((show) => {
              const cancelled = show.status === 'Cancelled'
              const c = portalCells(show, portalFor(show, portal))
              const flat = isFlatFee(show)
              const num = cn(td, 'whitespace-nowrap text-right tabular-nums', cancelled && 'line-through')
              return (
                <tr
                  key={show.id}
                  onClick={() => onOpen(show)}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-neutral-50',
                    cancelled && 'text-neutral-400',
                  )}
                >
                  <td className={cn(td, 'whitespace-nowrap tabular-nums', cancelled && 'line-through')}>
                    {show.date}
                  </td>
                  <td className={cn(td, 'whitespace-nowrap', cancelled && 'line-through')}>
                    {formatShortWeekday(show.date)}
                  </td>
                  <td className={td}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn('size-2.5 shrink-0 rounded-full', CATEGORY_STYLES[show.category].dot)} aria-hidden />
                      <span className={cancelled ? 'line-through' : ''}>{show.category}</span>
                    </span>
                  </td>
                  <td className={cn(td, 'font-medium text-neutral-900', cancelled && 'font-normal text-neutral-400 line-through')}>
                    {show.format}
                  </td>
                  <td className={cn(td, cancelled && 'line-through')}>{show.region}</td>
                  <td className={cn(td, cancelled && 'line-through')}>{show.organizedBy}</td>
                  <td className={cn(td, cancelled && 'line-through')}>{show.area || '—'}</td>
                  <td className={cn(td, cancelled && 'line-through')}>{show.venue || '—'}</td>
                  <td className={cn(td, cancelled && 'line-through')}>{show.revenueType}</td>
                  <td className={cn(td, 'text-right tabular-nums', cancelled && 'line-through')}>
                    {show.venueFee != null ? formatCurrency(show.venueFee) : '—'}
                  </td>
                  <td className={cn(td, cancelled && 'line-through')}>{show.merch ? 'Yes' : '—'}</td>
                  <td className={cn(td, 'text-right tabular-nums', cancelled && 'line-through')}>
                    {flat && show.flatFee != null ? formatCurrency(show.flatFee) : '—'}
                  </td>
                  <td className={cn(td, 'text-right tabular-nums', cancelled && 'line-through')}>
                    {flat ? '—' : (show.tickets ?? '—')}
                  </td>
                  <td className={cn(td, 'text-right tabular-nums', cancelled && 'line-through')}>
                    {!flat && show.ticketPrice != null ? formatCurrency(show.ticketPrice) : '—'}
                  </td>
                  <td className={cn(td, 'text-right tabular-nums', cancelled && 'line-through')}>
                    {!flat && show.projectedRevenue != null ? formatCurrency(show.projectedRevenue) : '—'}
                  </td>
                  <td className={cn(td, 'text-right font-medium tabular-nums', cancelled && 'font-normal line-through')}>
                    {formatCurrency(showRevenueOn(show, portal, todayISO))}
                  </td>
                  <td className={cn(td, cancelled && 'line-through')}>{show.status}</td>
                  <td className={num}>{c.sold}</td>
                  <td className={num}>{c.sellThrough}</td>
                  <td className={num}>{c.actualRev != null ? formatCurrency(c.actualRev) : ''}</td>
                  <td className={num}>{c.projTickets ?? ''}</td>
                  <td className={num}>{c.projRange}</td>
                  <td className={num}>{c.projRev != null ? formatCurrency(c.projRev) : ''}</td>
                  <td className={num}>{c.revRange}</td>
                  <td className={cn(td, 'whitespace-nowrap', cancelled && 'line-through', c.confidence === 'Low' && 'text-neutral-500')}>
                    {c.confidence}
                  </td>
                  <td
                    className={cn(
                      td,
                      'whitespace-nowrap',
                      cancelled && 'line-through',
                      !cancelled && c.sellout && 'font-medium text-amber-700',
                    )}
                  >
                    {c.sellout}
                  </td>
                  <td
                    className={cn(
                      td,
                      'whitespace-nowrap',
                      cancelled && 'line-through',
                      !cancelled && c.pace === 'Behind' && 'text-red-600',
                      !cancelled && c.pace === 'Ahead' && 'text-emerald-600',
                    )}
                  >
                    {c.pace}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {sorted.length > 0 && (
            <tfoot className="border-t border-neutral-200 bg-neutral-50/60 font-medium text-neutral-900">
            <tr>
                <td className={td} colSpan={12}>
                  Total ({active.length} non-cancelled)
                </td>
                <td className={cn(td, 'text-right tabular-nums')}>{totalTickets}</td>
                <td className={td} colSpan={2} />
                <td className={cn(td, 'text-right tabular-nums')}>{formatCurrency(totalRevenue)}</td>
                <td className={td} colSpan={11} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="sr-only" aria-live="polite">
        Showing {sorted.length} shows for {ym}, labeled by {formatLongDate(sorted[0]?.date ?? `${ym}-01`)} and after.
      </p>
    </div>
  )
}
