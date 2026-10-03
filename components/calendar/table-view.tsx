import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatLongDate, formatShortWeekday } from '@/lib/dates'
import { formatCurrency, type Show } from '@/lib/shows'
import { CATEGORY_STYLES } from './category-styles'

type Props = {
  ym: string
  shows: Show[]
  onOpen: (show: Show) => void
}

function csvCell(value: string | number) {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function exportCsv(ym: string, shows: Show[]) {
  const headers = [
    'Date',
    'Day',
    'Category',
    'Format',
    'Area',
    'Venue',
    'Tickets',
    'Price',
    'Proj. Revenue',
    'Status',
  ]
  const rows = shows.map((s) => [
    s.date,
    formatShortWeekday(s.date),
    s.category,
    s.format,
    s.area,
    s.venue,
    s.tickets ?? '',
    s.ticketPrice ?? '',
    s.projectedRevenue ?? '',
    s.status,
  ])
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

export function TableView({ ym, shows, onOpen }: Props) {
  const sorted = [...shows].sort((a, b) => a.date.localeCompare(b.date))
  const active = sorted.filter((s) => s.status !== 'Cancelled')
  const totalTickets = active.reduce((sum, s) => sum + (s.tickets ?? 0), 0)
  const totalRevenue = active.reduce((sum, s) => sum + (s.projectedRevenue ?? 0), 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => exportCsv(ym, sorted)}
          disabled={sorted.length === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50/60">
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Day</th>
              <th className={th}>Category</th>
              <th className={th}>Format</th>
              <th className={th}>Area</th>
              <th className={th}>Venue</th>
              <th className={cn(th, 'text-right')}>Tickets</th>
              <th className={cn(th, 'text-right')}>Price</th>
              <th className={cn(th, 'text-right')}>Proj. Revenue</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-neutral-400">
                  No shows this month.
                </td>
              </tr>
            )}
            {sorted.map((show) => {
              const cancelled = show.status === 'Cancelled'
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
                </tr>
              )
            })}
          </tbody>
          {sorted.length > 0 && (
            <tfoot className="border-t border-neutral-200 bg-neutral-50/60 font-medium text-neutral-900">
              <tr>
                <td className={td} colSpan={6}>
                  Total ({active.length} non-cancelled)
                </td>
                <td className={cn(td, 'text-right tabular-nums')}>{totalTickets}</td>
                <td className={td} />
                <td className={cn(td, 'text-right tabular-nums')}>{formatCurrency(totalRevenue)}</td>
                <td className={td} />
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
