'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { formatLongDate } from '@/lib/dates'
import {
  CATEGORIES,
  DATE_RE,
  DEFAULT_TICKET_PRICES,
  formatCurrency,
  FORMATS,
  ORGANIZERS,
  REGIONS,
  REVENUE_TYPES,
  STATUS_LABELS,
  STATUSES,
  type Category,
  type Organizer,
  type Region,
  type RevenueType,
  type Show,
  type ShowInput,
  type Status,
} from '@/lib/shows'
import {
  capitalize,
  compCount,
  CONFIDENCE_NOTES,
  confirmedTotal,
  projectedTotal,
  rangeLabel,
  timeAgo,
  type PortalMatch,
  type PortalSuggestion,
} from '@/lib/portal'
import { markersOn, type DayMarker } from '@/lib/markers'
import { CATEGORY_STYLES } from './category-styles'

type Props = {
  show?: Show
  date: string
  match?: PortalMatch
  getSuggestions?: (date: string) => Promise<PortalSuggestion[]>
  getMarkers?: (ym: string) => Promise<DayMarker[]>
  onClose: () => void
  onSave: (input: ShowInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const numStr = (n: number | null | undefined) => (n == null ? '' : String(n))
const inputCls =
  'h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-[15px] text-neutral-900 placeholder:text-neutral-300 transition-colors focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900'

function Field({
  label,
  htmlFor,
  optional,
  aside,
  className,
  children,
}: {
  label: string
  htmlFor: string
  optional?: boolean
  aside?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-700">
          {label} {optional && <span className="font-normal text-neutral-400">optional</span>}
        </label>
        {aside}
      </div>
      {children}
    </div>
  )
}

function Select({ id, value, onChange, options, labels }: { id: string; value: string; onChange: (v: string) => void; options: readonly string[]; labels?: Record<string, string> }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, 'appearance-none pr-10')}>
        {options.map((o) => (
          <option key={o} value={o}>
  {labels?.[o] ?? o}
  </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
    </div>
  )
}

function MoneyInput({ id, value, onChange, placeholder = '0' }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-neutral-400">$</span>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        className={cn(inputCls, 'pl-8 tabular-nums')}
      />
    </div>
  )
}

function PortalSummary({ match }: { match: PortalMatch }) {
  const p = match.projection
  const range = p ? rangeLabel(p) : null
  const rows: [string, React.ReactNode][] = []
  if (match.hasEvent) {
    const total = confirmedTotal(match) ?? 0
    const comps = compCount(match)
    const paid = Math.max(0, total - comps)
    const capacity = match.ticketsAvailable != null ? ` of ${match.ticketsAvailable}` : ''
    rows.push(['Tickets', `${total} confirmed (${paid} paid, ${comps} comp)${capacity}`])
    if (match.ticketPrices) rows.push(['Prices', match.ticketPrices])
    if (match.ticketMix) rows.push(['Mix', match.ticketMix])
    if (match.vips) rows.push(['VIPs', String(match.vips)])
    if (match.revenue != null) rows.push(['Actual revenue', formatCurrency(match.revenue)])
  }
  if (p) {
    const total = projectedTotal(p)
    if (total != null) {
      const paidNote = p.tickets != null ? ` · paid ~${Math.round(p.tickets)}` : ''
      rows.push(['Projection', `~${Math.round(total)} total${range ? ` (${range})` : ''}${paidNote}`])
    }
    if (p.revenue != null) {
      const revenueRange =
        p.revenueLow != null && p.revenueHigh != null
          ? ` (${formatCurrency(p.revenueLow)} to ${formatCurrency(p.revenueHigh)})`
          : ''
      rows.push(['Proj. revenue', `${formatCurrency(p.revenue)}${revenueRange}`])
    }
  }
  if (p?.confidence) {
    rows.push([
      'Confidence',
      <>
        {capitalize(p.confidence)}
        <span className="block text-xs text-neutral-500">{CONFIDENCE_NOTES[p.confidence]}</span>
      </>,
    ])
  }
  if (p?.paceLabel) rows.push(['Pace', capitalize(p.paceLabel)])
  if (rows.length === 0) return null

  return (
    <section aria-label="From portal" className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-neutral-700">From portal</h3>
        {p?.computedAt && <span className="text-xs text-neutral-400">updated {timeAgo(p.computedAt)}</span>}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-neutral-500">{label}</dt>
            <dd className="tabular-nums text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>
      {p?.selloutLikely && (
        <p className="w-fit rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Sellout likely</p>
      )}
    </section>
  )
}

export function ShowDialog({
  show,
  date: initialDate,
  match,
  getSuggestions,
  getMarkers,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const f = (name: string) => `${id}-${name}`

  const initialComputed =
    show?.tickets != null && show.ticketPrice != null ? show.tickets * show.ticketPrice : null

  const [category, setCategory] = useState<Category>(show?.category ?? 'Core')
  const [format, setFormat] = useState(show?.format ?? FORMATS.Core[0])
  const [date, setDate] = useState(show?.date ?? initialDate)
  const [status, setStatus] = useState<Status>(show?.status ?? 'Idea')
  const [region, setRegion] = useState<Region>(show?.region ?? 'LA')
  const [organizedBy, setOrganizedBy] = useState<Organizer>(show?.organizedBy ?? 'Sofar')
  const [revenueType, setRevenueType] = useState<RevenueType>(show?.revenueType ?? 'Ticketed')
  const [flatFee, setFlatFee] = useState(numStr(show?.flatFee))
  const [venueFee, setVenueFee] = useState(numStr(show?.venueFee))
  const [merch, setMerch] = useState(show?.merch ?? false)
  const [eventPlanner, setEventPlanner] = useState(show?.eventPlanner ?? false)
  const [area, setArea] = useState(show?.area ?? '')
  const [venue, setVenue] = useState(show?.venue ?? '')
  const [tickets, setTickets] = useState(numStr(show?.tickets))
  const [price, setPrice] = useState(numStr(show?.ticketPrice ?? DEFAULT_TICKET_PRICES[format]))
  const [revenueOverride, setRevenueOverride] = useState<string | null>(
    show && show.projectedRevenue != null && show.projectedRevenue !== initialComputed
      ? String(show.projectedRevenue)
      : null,
  )
  const [portalEventId, setPortalEventId] = useState(show?.portalEventId ?? '')
  const [notes, setNotes] = useState(show?.notes ?? '')
  const [pending, setPending] = useState<'save' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const wantSuggestions = Boolean(getSuggestions) && portalEventId.trim() === '' && DATE_RE.test(date)
  const { data: suggestions } = useSWR(wantSuggestions ? ['portal-suggestions', date] : null, () =>
    getSuggestions!(date),
  )

  const { data: customMarkers } = useSWR(
    getMarkers && DATE_RE.test(date) ? ['markers', date.slice(0, 7)] : null,
    () => getMarkers!(date.slice(0, 7)),
  )
  const dateMarkers = DATE_RE.test(date) ? markersOn(date, customMarkers ?? []) : []

  const isFlat = revenueType === 'Flat fee'
  const t = tickets === '' ? null : Number(tickets)
  const p = price === '' ? null : Number(price)
  const computed = t != null && p != null && Number.isFinite(t * p) ? Math.round(t * p * 100) / 100 : null
  const revenueValue = revenueOverride ?? numStr(computed)

  const pickFormat = (next: string) => {
    setFormat(next)
    setPrice(numStr(DEFAULT_TICKET_PRICES[next]))
  }

  const pickCategory = (next: Category) => {
    if (next === category) return
    setCategory(next)
    pickFormat(FORMATS[next][0])
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending('save')
    try {
      await onSave({
        id: show?.id,
        date,
        category,
        format,
        status,
        region,
        organizedBy,
        area,
        venue,
        tickets: t,
        ticketPrice: p,
        projectedRevenue: revenueValue === '' ? null : Number(revenueValue),
        portalEventId,
        notes,
        revenueType,
        flatFee: flatFee === '' ? null : Number(flatFee),
        venueFee: venueFee === '' ? null : Number(venueFee),
        merch,
        eventPlanner,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this show.')
      setPending(null)
    }
  }

  const remove = async () => {
    if (!show) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setError(null)
    setPending('delete')
    try {
      await onDelete(show.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this show.')
      setPending(null)
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={f('title')}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto max-h-[min(92dvh,52rem)] w-[calc(100%-1.5rem)] max-w-xl overflow-hidden rounded-3xl bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-900/30 backdrop:backdrop-blur-[2px]"
    >
      <form onSubmit={submit} className="flex max-h-[inherit] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 pb-5 pt-6 sm:px-8">
          <div className="flex flex-col gap-1">
            <h2 id={f('title')} className="text-xl font-semibold tracking-tight">
              {show ? 'Edit show' : 'New show'}
            </h2>
            <p className="text-sm text-neutral-500">{date ? formatLongDate(date) : 'Pick a date'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 inline-flex size-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-6 py-6 sm:px-8">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-neutral-700">Category</legend>
            <div className="grid grid-cols-3 gap-2.5">
              {CATEGORIES.map((c) => {
                const active = c === category
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() => pickCategory(c)}
                    className={cn(
                      'flex h-12 items-center justify-center gap-2 rounded-xl border text-[15px] transition-colors',
                      active ? CATEGORY_STYLES[c].selected : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50',
                    )}
                  >
                    <span className={cn('size-2 rounded-full', CATEGORY_STYLES[c].dot)} aria-hidden />
                    {c}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Field label="Format" htmlFor={f('format')}>
            <Select id={f('format')} value={format} onChange={pickFormat} options={FORMATS[category]} />
          </Field>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Date" htmlFor={f('date')}>
              <input id={f('date')} type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              {dateMarkers.map((m) => (
                <p key={m.id} className={cn('text-xs', m.type === 'event' ? 'text-amber-700' : 'text-neutral-500')}>
                  {m.label}
                  {m.note && ` · ${m.note}`}
                </p>
              ))}
            </Field>
            <Field label="Status" htmlFor={f('status')}>
              <Select id={f('status')} value={status} onChange={(v) => setStatus(v as Status)} options={STATUSES} labels={STATUS_LABELS} />
            </Field>
            <Field label="Region" htmlFor={f('region')}>
              <Select id={f('region')} value={region} onChange={(v) => setRegion(v as Region)} options={REGIONS} />
            </Field>
            <Field label="Organized by" htmlFor={f('organizedBy')}>
              <Select
                id={f('organizedBy')}
                value={organizedBy}
                onChange={(v) => setOrganizedBy(v as Organizer)}
                options={ORGANIZERS}
              />
            </Field>
            <Field label="Area" htmlFor={f('area')}>
              <input id={f('area')} value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Venice" maxLength={120} className={inputCls} />
            </Field>
            <Field label="Venue" htmlFor={f('venue')}>
              <input id={f('venue')} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue name" maxLength={160} className={inputCls} />
            </Field>
            <Field label="Revenue type" htmlFor={f('revenueType')}>
              <Select
                id={f('revenueType')}
                value={revenueType}
                onChange={(v) => setRevenueType(v as RevenueType)}
                options={REVENUE_TYPES}
              />
            </Field>
            <Field label="Venue fee" htmlFor={f('venueFee')} optional>
              <MoneyInput id={f('venueFee')} value={venueFee} onChange={setVenueFee} />
            </Field>
            {isFlat ? (
              <Field label="Flat fee" htmlFor={f('flatFee')}>
                <MoneyInput id={f('flatFee')} value={flatFee} onChange={setFlatFee} />
              </Field>
            ) : (
              <>
                <Field label="Tickets" htmlFor={f('tickets')}>
                  <input
                    id={f('tickets')}
                    inputMode="numeric"
                    value={tickets}
                    placeholder="0"
                    onChange={(e) => setTickets(e.target.value.replace(/\D/g, ''))}
                    className={cn(inputCls, 'tabular-nums')}
                  />
                </Field>
                <Field label="Ticket price" htmlFor={f('price')}>
                  <MoneyInput id={f('price')} value={price} onChange={setPrice} />
                </Field>
              </>
            )}
          </div>

          {!isFlat && (
          <Field
            label="Projected revenue"
            htmlFor={f('revenue')}
            aside={
              revenueOverride != null ? (
                <button type="button" onClick={() => setRevenueOverride(null)} className="text-xs text-neutral-500 underline-offset-2 hover:underline">
                  Reset to tickets × price
                </button>
              ) : (
                <span className="text-xs text-neutral-400">Tickets × price</span>
              )
            }
          >
            <MoneyInput
              id={f('revenue')}
              value={revenueValue}
              onChange={(v) => setRevenueOverride(v === '' && computed == null ? null : v)}
            />
          </Field>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
            <label className="flex items-center gap-3 text-[15px] text-neutral-700">
              <input
                type="checkbox"
                checked={merch}
                onChange={(e) => setMerch(e.target.checked)}
                className="size-5 rounded border-neutral-300 accent-neutral-900"
              />
              Merch table at this show
            </label>
            <label className="flex items-center gap-3 text-[15px] text-neutral-700">
              <input
                type="checkbox"
                checked={eventPlanner}
                onChange={(e) => setEventPlanner(e.target.checked)}
                className="size-5 rounded border-neutral-300 accent-neutral-900"
              />
              Event planner
            </label>
          </div>

          <Field label="Portal event ID" htmlFor={f('portal')} optional>
            <input id={f('portal')} value={portalEventId} onChange={(e) => setPortalEventId(e.target.value)} maxLength={120} className={inputCls} />
            {wantSuggestions && suggestions && suggestions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-neutral-400">Portal events on this date</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s.eventId}
                      type="button"
                      onClick={() => setPortalEventId(s.eventId)}
                      className="rounded-lg border border-neutral-200 px-2.5 py-1 text-left text-xs text-neutral-700 transition-colors hover:border-neutral-900 hover:bg-neutral-50"
                    >
                      <span className="tabular-nums">{s.eventId}</span>
                      {s.venue && <span className="text-neutral-500"> · {s.venue}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Field>

          {match && <PortalSummary match={match} />}

          <Field label="Notes" htmlFor={f('notes')} optional>
            <textarea
              id={f('notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={4000}
              className={cn(inputCls, 'h-auto resize-y py-3')}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-100 px-6 py-5 sm:px-8">
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            {show && (
              <button
                type="button"
                onClick={remove}
                disabled={pending !== null}
                className={cn(
                  'h-12 rounded-xl px-4 text-[15px] font-medium transition-colors disabled:opacity-50',
                  confirmDelete ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-600 hover:bg-red-50',
                )}
              >
                {pending === 'delete' ? 'Deleting…' : confirmDelete ? 'Confirm delete' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto h-12 rounded-xl px-5 text-[15px] text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending !== null}
              className="h-12 rounded-xl bg-neutral-900 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60"
            >
              {pending === 'save' ? 'Saving…' : show ? 'Save changes' : 'Add show'}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
