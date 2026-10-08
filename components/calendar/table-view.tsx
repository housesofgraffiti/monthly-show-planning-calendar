'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatLongDate, formatShortWeekday } from '@/lib/dates'
import { formatCurrency, statusLabel, type Show } from '@/lib/shows'
import {
  capitalize,
  compCount,
  confirmedTotal,
  isPastShow,
  portalFor,
  projectedTotal,
  rangeLabel,
  sellThrough,
  type PortalMap,
  type PortalMatch,
} from '@/lib/portal'
import { isFlatFee, isLocalProducer, showMoney, showRevenueOn } from '@/lib/revenue'
import { modelTotal } from '@/lib/adjustments'
import { decideByFor, featuredInNames, formatDayShort, type Send } from '@/lib/sends'
import { CATEGORY_STYLES } from './category-styles'

type Props = {
  ym: string
  todayISO: string
  shows: Show[]
  portal?: PortalMap
  sends: Send[]
  onOpen: (show: Show) => void
}

const SHOW_ALL_KEY = 'show-planner:table-all-columns'

const EMPTY_CELLS = {
  confirmed: '',
  paid: null as number | null,
  comp: null as number | null,
  vips: null as number | null,
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

function portalCells(show: Show, m: PortalMatch | undefined): typeof EMPTY_CELLS {
  if (isFlatFee(show)) return EMPTY_CELLS
  const p = m?.projection
  const st = m ? sellThrough(m) : null
  const revenueOnly = isLocalProducer(show)
  const hasTickets = !revenueOnly && m?.hasEvent === true
  const total = m ? (confirmedTotal(m) ?? 0) : 0
  const comps = m ? compCount(m) : 0
  const projectedTickets = p ? projectedTotal(p) : null
  return {
    confirmed: hasTickets && m ? `${total}/${m.ticketsAvailable ?? ''}` : '',
    paid: hasTickets ? Math.max(0, total - comps) : null,
    comp: hasTickets ? comps : null,
    vips: hasTickets && m?.vips ? m.vips : null,
    sellThrough: revenueOnly || st == null ? '' : `${Math.round(st * 100)}%`,
    actualRev: m?.hasEvent && m.revenue != null ? m.revenue : null,
    projTickets: !revenueOnly && projectedTickets != null ? Math.round(projectedTickets) : null,
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

type Row = {
  show: Show
  cancelled: boolean
  flat: boolean
  c: ReturnType<typeof portalCells>
  model: number | null
  adjusted: number | null
  reason: string
  finalTotal: number | null
  decideBy: string
  featuredIn: string
  locked: number
  revenue: number
}

type Totals = { tickets: number; revenue: number }

type Column = {
  id: string
  label: string
  csvLabel?: string
  // Core columns are always shown; the rest appear under "Show all columns".
  core?: boolean
  csvOnly?: boolean
  right?: boolean
  cellClass?: (row: Row) => string | false
  cell?: (row: Row) => ReactNode
  csv: (row: Row) => string | number
  foot?: (totals: Totals) => ReactNode
}

const dash = (value: ReactNode) => value ?? '—'
const yesNo = (value: boolean) => (value ? 'Yes' : 'No')

const COLUMNS: Column[] = [
  {
    id: 'date',
    label: 'Date',
    core: true,
    cellClass: () => 'whitespace-nowrap tabular-nums',
    cell: (r) => r.show.date,
    csv: (r) => r.show.date,
  },
  {
    id: 'day',
    label: 'Day',
    core: true,
    cellClass: () => 'whitespace-nowrap',
    cell: (r) => formatShortWeekday(r.show.date),
    csv: (r) => formatShortWeekday(r.show.date),
  },
  {
    id: 'venue',
    label: 'Venue',
    core: true,
    cell: (r) => r.show.venue || '—',
    csv: (r) => r.show.venue,
  },
  {
    id: 'format',
    label: 'Format',
    core: true,
    cellClass: (r) => (r.cancelled ? 'font-normal text-neutral-400' : 'font-medium text-neutral-900'),
    cell: (r) => (
      <span className="inline-flex items-center gap-1.5">
        <span className={cn('size-2.5 shrink-0 rounded-full', CATEGORY_STYLES[r.show.category].dot)} aria-hidden />
        {r.show.format}
      </span>
    ),
    csv: (r) => r.show.format,
  },
  { id: 'category', label: 'Category', cell: (r) => r.show.category, csv: (r) => r.show.category },
  { id: 'region', label: 'Region', cell: (r) => r.show.region, csv: (r) => r.show.region },
  { id: 'organizedBy', label: 'Organized By', cell: (r) => r.show.organizedBy, csv: (r) => r.show.organizedBy },
  { id: 'area', label: 'Area', cell: (r) => r.show.area || '—', csv: (r) => r.show.area },
  { id: 'revenueType', label: 'Revenue Type', cell: (r) => r.show.revenueType, csv: (r) => r.show.revenueType },
  {
    id: 'venueFee',
    label: 'Venue Fee',
    right: true,
    cell: (r) => (r.show.venueFee != null ? formatCurrency(r.show.venueFee) : '—'),
    csv: (r) => r.show.venueFee ?? '',
  },
  { id: 'merch', label: 'Merch', cell: (r) => (r.show.merch ? 'Yes' : '—'), csv: (r) => yesNo(r.show.merch) },
  {
    id: 'eventPlanner',
    label: 'Event Planner',
    cell: (r) => (r.show.eventPlanner ? 'Yes' : '—'),
    csv: (r) => yesNo(r.show.eventPlanner),
  },
  {
    id: 'flatFee',
    label: 'Flat Fee',
    right: true,
    cell: (r) => (r.flat && r.show.flatFee != null ? formatCurrency(r.show.flatFee) : '—'),
    csv: (r) => r.show.flatFee ?? '',
  },
  {
    id: 'tickets',
    label: 'Tickets',
    right: true,
    cell: (r) => (r.flat ? '—' : dash(r.show.tickets)),
    csv: (r) => (r.flat ? '' : (r.show.tickets ?? '')),
    foot: (t) => t.tickets,
  },
  {
    id: 'price',
    label: 'Price',
    right: true,
    cell: (r) => (!r.flat && r.show.ticketPrice != null ? formatCurrency(r.show.ticketPrice) : '—'),
    csv: (r) => (r.flat ? '' : (r.show.ticketPrice ?? '')),
  },
  {
    id: 'plan',
    label: 'Plan',
    csvLabel: 'Proj. Revenue',
    right: true,
    cell: (r) => (!r.flat && r.show.projectedRevenue != null ? formatCurrency(r.show.projectedRevenue) : '—'),
    csv: (r) => (r.flat ? '' : (r.show.projectedRevenue ?? '')),
  },
  {
    id: 'revenue',
    label: 'Revenue',
    right: true,
    cellClass: (r) => (r.cancelled ? 'font-normal' : 'font-medium'),
    cell: (r) => formatCurrency(r.revenue),
    csv: (r) => r.revenue,
    foot: (t) => formatCurrency(t.revenue),
  },
  { id: 'status', label: 'Status', core: true, cell: (r) => statusLabel(r.show.status), csv: (r) => statusLabel(r.show.status) },
  {
    id: 'confirmed',
    label: 'Confirmed',
    core: true,
    right: true,
    cell: (r) => r.c.confirmed,
    csv: (r) => r.c.confirmed,
  },
  { id: 'paid', label: 'Paid', right: true, cell: (r) => r.c.paid ?? '', csv: (r) => r.c.paid ?? '' },
  { id: 'comp', label: 'Comp', right: true, cell: (r) => r.c.comp ?? '', csv: (r) => r.c.comp ?? '' },
  { id: 'vips', label: 'VIPs', right: true, cell: (r) => r.c.vips ?? '', csv: (r) => r.c.vips ?? '' },
  {
    id: 'sellThrough',
    label: 'Sell-through %',
    right: true,
    cell: (r) => r.c.sellThrough,
    csv: (r) => r.c.sellThrough,
  },
  {
    id: 'locked',
    label: 'Locked in',
    csvLabel: 'Locked In',
    core: true,
    right: true,
    cell: (r) => formatCurrency(r.locked),
    csv: (r) => r.locked,
  },
  {
    id: 'actualRev',
    label: 'Actual Rev',
    right: true,
    cell: (r) => (r.c.actualRev != null ? formatCurrency(r.c.actualRev) : ''),
    csv: (r) => r.c.actualRev ?? '',
  },
  {
    id: 'projected',
    label: 'Projected',
    csvLabel: 'Proj. Rev',
    core: true,
    right: true,
    cell: (r) =>
      r.c.projRev != null ? (
        <>
          {formatCurrency(r.c.projRev)}
          {r.c.revRange && <span className="block text-xs font-normal text-neutral-400">{r.c.revRange}</span>}
        </>
      ) : (
        ''
      ),
    csv: (r) => r.c.projRev ?? '',
  },
  {
    id: 'projTickets',
    label: 'Proj. Tickets',
    right: true,
    cell: (r) => r.c.projTickets ?? '',
    csv: (r) => r.c.projTickets ?? '',
  },
  { id: 'projRange', label: 'Proj. Range', right: true, cell: (r) => r.c.projRange, csv: (r) => r.c.projRange },
  {
    id: 'modelProj',
    label: 'Model proj.',
    right: true,
    cell: (r) => r.model ?? '',
    csv: (r) => r.model ?? '',
  },
  {
    id: 'adjusted',
    label: 'Adjusted',
    right: true,
    cell: (r) => r.adjusted ?? '',
    csv: (r) => r.adjusted ?? '',
  },
  { id: 'adjustmentReason', label: 'Reason', cell: (r) => r.reason, csv: (r) => r.reason },
  {
    id: 'finalTotal',
    label: 'Final total',
    right: true,
    cell: (r) => r.finalTotal ?? '',
    csv: (r) => r.finalTotal ?? '',
  },
  { id: 'revRange', label: 'Rev. Range', csvOnly: true, csv: (r) => r.c.revRange },
  {
    id: 'confidence',
    label: 'Confidence',
    cellClass: (r) => !r.cancelled && r.c.confidence === 'Low' && 'text-neutral-500',
    cell: (r) => r.c.confidence,
    csv: (r) => r.c.confidence,
  },
  {
    id: 'sellout',
    label: 'Sellout',
    cellClass: (r) => !r.cancelled && Boolean(r.c.sellout) && 'font-medium text-amber-700',
    cell: (r) => r.c.sellout,
    csv: (r) => r.c.sellout,
  },
  {
    id: 'pace',
    label: 'Pace',
    core: true,
    cellClass: (r) =>
      !r.cancelled && (r.c.pace === 'Behind' ? 'text-red-600' : r.c.pace === 'Ahead' ? 'text-emerald-600' : false),
    cell: (r) => r.c.pace,
    csv: (r) => r.c.pace,
  },
  { id: 'decideBy', label: 'Decide by', cell: (r) => r.decideBy, csv: (r) => r.decideBy },
  { id: 'featuredIn', label: 'Featured in', cell: (r) => r.featuredIn, csv: (r) => r.featuredIn },
]

function buildRow(show: Show, portal: PortalMap | undefined, todayISO: string, sends: Send[]): Row {
  const decideBy = decideByFor(show, sends, todayISO)
  const match = portalFor(show, portal)
  const past = isPastShow(show, todayISO)
  const ticketed = !isFlatFee(show) && !isLocalProducer(show)
  const model = ticketed ? modelTotal(match) : null
  return {
    show,
    cancelled: show.status === 'Cancelled',
    flat: isFlatFee(show),
    c: portalCells(show, match),
    model: model != null ? Math.round(model) : null,
    adjusted: ticketed ? show.adjustedTotal : null,
    reason: ticketed && show.adjustedTotal != null ? (show.adjustmentReason ?? '') : '',
    finalTotal: ticketed && past && match?.hasEvent ? (confirmedTotal(match) ?? null) : null,
    decideBy: decideBy ? formatDayShort(decideBy.date) : '',
    featuredIn: featuredInNames(show, sends).join('; '),
    locked: showMoney(show, match, past).lockedIn,
    revenue: showRevenueOn(show, portal, todayISO),
  }
}

function csvCell(value: string | number) {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// The export always includes every column, whatever the table is showing.
function exportCsv(ym: string, rows: Row[]) {
  const headers = COLUMNS.map((col) => col.csvLabel ?? col.label)
  const lines = rows.map((row) => COLUMNS.map((col) => col.csv(row)))
  const csv = [headers, ...lines].map((line) => line.map(csvCell).join(',')).join('\n')
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
const numeric = 'whitespace-nowrap text-right tabular-nums'

export function TableView({ ym, todayISO, shows, portal, sends, onOpen }: Props) {
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    try {
      setShowAll(window.localStorage.getItem(SHOW_ALL_KEY) === '1')
    } catch {
      // Storage can be blocked; the table just starts in the short view.
    }
  }, [])

  const toggleShowAll = (next: boolean) => {
    setShowAll(next)
    try {
      window.localStorage.setItem(SHOW_ALL_KEY, next ? '1' : '0')
    } catch {
      // Not remembered, but the toggle still works for this visit.
    }
  }

  const sorted = [...shows].sort((a, b) => a.date.localeCompare(b.date))
  const rows = sorted.map((show) => buildRow(show, portal, todayISO, sends))
  const active = rows.filter((r) => !r.cancelled)
  const totals: Totals = {
    tickets: active.reduce((sum, r) => sum + (r.flat ? 0 : (r.show.tickets ?? 0)), 0),
    revenue: active.reduce((sum, r) => sum + r.revenue, 0),
  }

  const visible = COLUMNS.filter((col) => !col.csvOnly && (showAll || col.core))
  const firstTotal = visible.findIndex((col) => col.foot)
  const labelSpan = firstTotal === -1 ? visible.length : firstTotal

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => toggleShowAll(e.target.checked)}
            className="size-4 rounded border-neutral-300 accent-neutral-900"
          />
          Show all columns
        </label>
        <button
          type="button"
          onClick={() => exportCsv(ym, rows)}
          disabled={rows.length === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200">
        <table className={cn('w-full border-collapse text-sm', showAll ? 'min-w-[3500px]' : 'min-w-[900px]')}>
          <thead className="border-b border-neutral-200 bg-neutral-50/60">
            <tr>
              {visible.map((col) => (
                <th key={col.id} className={cn(th, col.right && 'text-right')}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={visible.length} className="px-3 py-10 text-center text-neutral-400">
                  No shows this month.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.show.id}
                onClick={() => onOpen(row.show)}
                className={cn(
                  'cursor-pointer transition-colors hover:bg-neutral-50',
                  row.cancelled && 'text-neutral-400',
                )}
              >
                {visible.map((col) => (
                  <td
                    key={col.id}
                    className={cn(td, col.right && numeric, row.cancelled && 'line-through', col.cellClass?.(row))}
                  >
                    {col.cell?.(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-neutral-200 bg-neutral-50/60 font-medium text-neutral-900">
              <tr>
                <td className={td} colSpan={labelSpan}>
                  Total ({active.length} non-cancelled)
                </td>
                {visible.slice(labelSpan).map((col) => (
                  <td key={col.id} className={cn(td, col.right && 'text-right tabular-nums')}>
                    {col.foot?.(totals)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="sr-only" aria-live="polite">
        Showing {rows.length} shows for {ym}, labeled by {formatLongDate(sorted[0]?.date ?? `${ym}-01`)} and after.
      </p>
    </div>
  )
}
