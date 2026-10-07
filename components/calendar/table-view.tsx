import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatLongDate, formatShortWeekday } from '@/lib/dates'
import { formatCurrency, type Show } from '@/lib/shows'
import { capitalize, portalFor, rangeLabel, sellThrough, type PortalMap, type PortalMatch } from '@/lib/portal'
import { CATEGORY_STYLES } from './category-styles'

type Props = {
  ym: string
  shows: Show[]
  portal?: PortalMap
  onOpen: (show: Show) => void
}

function portalCells(m: PortalMatch | undefined) {
  const p = m?.projection
  const st = m ? sellThrough(m) : null
  return {
    sold: m?.hasEvent ? `${m.confirmed ?? 0}/${m.ticketsAvailable ?? ''}` : '',
    sellThrough: st == null ? '' : `${Math.round(st * 100)}%`,
    actualRev: m?.hasEvent && m.revenue != null ? m.revenue : null,
    projTickets: p?.tickets != null ? Math.round(p.tickets) : null,
    projRange: p ? (rangeLabel(p, '–') ?? '') : '',
    projRev: p?.revenue != null ? p.revenue : null,
    pace: p?.paceLabel ? capitalize(p.paceLabel) : '',
  }
}

function csvCell(value: string | number) {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv(ym: string, shows: Show[], portal: PortalMap | undefined) {
  const headers = [
    'Date',
    'Day',
    'Category',
    'Format',
    'Region',
    'Organized By',
    'Area',
    'Venue',
    'Tickets',
    'Price',
    'Proj. Revenue',
    'Status',
    'Sold',
    'Sell-through %',
    'Actual Rev',
    'Proj. Tickets',
    'Proj. Range',
    'Proj. Rev',
    'Pace',
  ]
  const rows = shows.map((s) => {
    const c = portalCells(portalFor(s, portal))
    return [
    s.date,
    formatShortWeekday(s.date),
    s.category,
    s.format,
    s.region,
    s.organizedBy,
    s.area,
    s.venue,
    s.tickets ?? '',
    s.ticketPrice ?? '',
    s.projectedRevenue ?? '',
    s.status,
    c.sold,
    c.sellThrough,
    c.actualRev ?? '',
    c.projTickets ?? '',
    c.projRange,
    c.projRev ?? '',
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

export function TableView({ ym, shows, portal, onOpen }: Props) {
  const sorted = [...shows].sort((a, b) => a.date.localeCompare(b.date))
  const active = sorted.filter((s) => s.status !== 'Cancelled')
  const totalTickets = active.reduce((sum, s) => sum + (s.tickets ?? 0), 0)
  const totalRevenue = active.reduce((sum, s) => sum + (s.projectedRevenue ?? 0), 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => exportCsv(ym, sorted, portal)}
          disabled={sorted.length === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200">
        <table className="w-full min-w-[1800px] border-collapse text-sm">
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
              <th className={cn(th, 'text-right')}>Tickets</th>
              <th className={cn(th, 'text-right')}>Price</th>
              <th className={cn(th, 'text-right')}>Proj. Revenue</th>
              <th className={th}>Status</th>
              <th className={cn(th, 'text-right')}>Sold</th>
              <th className={cn(th, 'text-right')}>Sell-through %</th>
              <th className={cn(th, 'text-right')}>Actual Rev</th>
              <th className={cn(th, 'text-right')}>Proj. Tickets</th>
              <th className={cn(th, 'text-right')}>Proj. Range</th>
              <th className={cn(th, 'text-right')}>Proj. Rev</th>
              <th className={th}>Pace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={19} className="px-3 py-10 text-center text-neutral-400">
                  No shows this month.
                </td>
              </tr>
            )}
            {sorted.map((show) => {
              const cancelled = show.status === 'Cancelled'
              const c = portalCells(portalFor(show, portal))
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
                  <td className={cn(td, 'text-right tabular-nums', cancelled && 'line-through')}>
                    {show.tickets ?? '—'}
                  </td>
                  <td className={cn(td, 'text-right tabular-nums', cancelled && 'line-through')}>
                    {show.ticketPrice != null ? formatCurrency(show.ticketPrice) : '—'}
                  </td>
                  <td className={cn(td, 'text-right tabular-nums', cancelled && 'line-through')}>
                    {show.projectedRevenue != null ? formatCurrency(show.projectedRevenue) : '—'}
                  </td>
                  <td className={cn(td, cancelled && 'line-through')}>{show.status}</td>
                  <td className={num}>{c.sold}</td>
                  <td className={num}>{c.sellThrough}</td>
                  <td className={num}>{c.actualRev != null ? formatCurrency(c.actualRev) : ''}</td>
                  <td className={num}>{c.projTickets ?? ''}</td>
                  <td className={num}>{c.projRange}</td>
                  <td className={num}>{c.projRev != null ? formatCurrency(c.projRev) : ''}</td>
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
                <td className={td} colSpan={8}>
                  Total ({active.length} non-cancelled)
                </td>
                <td className={cn(td, 'text-right tabular-nums')}>{totalTickets}</td>
                <td className={td} />
                <td className={cn(td, 'text-right tabular-nums')}>{formatCurrency(totalRevenue)}</td>
                <td className={td} colSpan={8} />
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
