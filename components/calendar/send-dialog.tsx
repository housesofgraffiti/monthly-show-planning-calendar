'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { addDays, formatLongDate } from '@/lib/dates'
import { DATE_RE, type Show } from '@/lib/shows'
import { confirmedLabel, type PortalMap } from '@/lib/portal'
import {
  formatDayShort,
  PUSH_WINDOW,
  pushCandidates,
  SEND_CHANNELS,
  SEND_STATUSES,
  type PushCandidate,
  type Send,
  type SendChannel,
  type SendInput,
  type SendStatus,
} from '@/lib/sends'

type Props = {
  send?: Send
  date: string
  getShowsRange: (start: string, end: string) => Promise<{ shows: Show[]; portal: PortalMap }>
  onClose: () => void
  onSave: (input: SendInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const inputCls =
  'h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-[15px] text-neutral-900 placeholder:text-neutral-300 transition-colors focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900'

function Field({
  label,
  htmlFor,
  optional,
  children,
}: {
  label: string
  htmlFor: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-700">
        {label}
        {optional && <span className="ml-1.5 font-normal text-neutral-400">optional</span>}
      </label>
      {children}
    </div>
  )
}

function CandidateRow({
  candidate,
  checked,
  inputId,
  onToggle,
}: {
  candidate: PushCandidate
  checked: boolean
  inputId: string
  onToggle: () => void
}) {
  const { show, match, projected, adjusted, pace } = candidate
  return (
    <li>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white"
      >
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 size-5 shrink-0 rounded border-neutral-300 accent-neutral-900"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-neutral-900">{show.venue || show.area || 'Venue TBD'}</span>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs tabular-nums text-neutral-500">
            <span>{formatDayShort(show.date)}</span>
            <span>{match?.hasEvent ? confirmedLabel(match) : 'No sales yet'}</span>
            {projected != null && (
              <span>
                ~{Math.round(projected)} proj{adjusted && ' adj'}
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
          </span>
        </span>
      </label>
    </li>
  )
}

export function SendDialog({ send, date: initialDate, getShowsRange, onClose, onSave, onDelete }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const f = (name: string) => `${id}-${name}`

  const [date, setDate] = useState(send?.date ?? initialDate)
  const [name, setName] = useState(send?.name ?? '')
  const [channel, setChannel] = useState<SendChannel>(send?.channel ?? 'Email')
  const [segment, setSegment] = useState(send?.segment ?? '')
  const [assignedTo, setAssignedTo] = useState(send?.assignedTo ?? '')
  const [status, setStatus] = useState<SendStatus>(send?.status ?? 'Planned')
  const [notes, setNotes] = useState(send?.notes ?? '')
  const [featured, setFeatured] = useState<string[]>(send?.featuredShowIds ?? [])
  // The list is ordered by what was featured when the panel opened, so ticking a box does not move rows.
  const [initiallyFeatured] = useState<string[]>(send?.featuredShowIds ?? [])
  const [pending, setPending] = useState<'save' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const validDate = DATE_RE.test(date)
  const start = validDate ? addDays(date, PUSH_WINDOW.min) : null
  const end = validDate ? addDays(date, PUSH_WINDOW.max) : null
  const {
    data: range,
    error: rangeError,
    isLoading,
  } = useSWR(start && end ? ['send-candidates', start, end] : null, () => getShowsRange(start!, end!))

  const { candidates, hiddenSellouts } =
    range && validDate
      ? pushCandidates(range.shows, range.portal, date, initiallyFeatured)
      : { candidates: [], hiddenSellouts: 0 }

  const toggle = (showId: string) =>
    setFeatured((current) => (current.includes(showId) ? current.filter((x) => x !== showId) : [...current, showId]))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending('save')
    try {
      await onSave({ id: send?.id, date, name, channel, segment, assignedTo, status, notes, featuredShowIds: featured })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this send.')
      setPending(null)
    }
  }

  const remove = async () => {
    if (!send) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setError(null)
    setPending('delete')
    try {
      await onDelete(send.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this send.')
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
      className="m-auto max-h-[min(92dvh,52rem)] w-[calc(100%-1.5rem)] max-w-xl overflow-hidden rounded-3xl max-sm:mb-0 max-sm:max-h-[94dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-900/30 backdrop:backdrop-blur-[2px]"
    >
      <form onSubmit={submit} className="flex max-h-[inherit] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 pb-5 pt-6 sm:px-8">
          <div className="flex flex-col gap-1">
            <h2 id={f('title')} className="text-xl font-semibold tracking-tight">
              {send ? 'Edit send' : 'New send'}
            </h2>
            <p className="text-sm text-neutral-500">{validDate ? formatLongDate(date) : 'Pick a date'}</p>
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
          <Field label="Name" htmlFor={f('name')}>
            <input
              id={f('name')}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BAU Newsletter: Monthly Show"
              maxLength={160}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Date" htmlFor={f('date')}>
              <input
                id={f('date')}
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium text-neutral-700">Channel</legend>
              <div className="grid grid-cols-2 gap-2.5">
                {SEND_CHANNELS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={c === channel}
                    onClick={() => setChannel(c)}
                    className={cn(
                      'h-12 rounded-xl border text-[15px] transition-colors',
                      c === channel
                        ? 'border-neutral-900 bg-neutral-900 font-medium text-white'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label="Segment" htmlFor={f('segment')} optional>
              <input
                id={f('segment')}
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="e.g. 12m Engaged"
                maxLength={120}
                className={inputCls}
              />
            </Field>
            <Field label="Assigned to" htmlFor={f('assignedTo')} optional>
              <input
                id={f('assignedTo')}
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                maxLength={120}
                className={inputCls}
              />
            </Field>
            <Field label="Status" htmlFor={f('status')}>
              <select
                id={f('status')}
                value={status}
                onChange={(e) => setStatus(e.target.value as SendStatus)}
                className={inputCls}
              >
                {SEND_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <section
            aria-label="Push candidates"
            className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4"
          >
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-medium text-neutral-700">Push candidates</h3>
              <p className="text-xs text-neutral-500">
                Shows {PUSH_WINDOW.min} to {PUSH_WINDOW.max} days after this send. Ticked shows are featured in it.
              </p>
            </div>
            {!validDate ? (
              <p className="text-sm text-neutral-400">Pick a date to see candidates.</p>
            ) : rangeError ? (
              <p role="alert" className="text-sm text-red-600">
                Could not load shows for this window.
              </p>
            ) : isLoading ? (
              <p className="text-sm text-neutral-400">Loading shows…</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-neutral-400">
                No shows {PUSH_WINDOW.min} to {PUSH_WINDOW.max} days after this send.
              </p>
            ) : (
              <ul className="flex flex-col">
                {candidates.map((candidate) => (
                  <CandidateRow
                    key={candidate.show.id}
                    candidate={candidate}
                    inputId={f(`show-${candidate.show.id}`)}
                    checked={featured.includes(candidate.show.id)}
                    onToggle={() => toggle(candidate.show.id)}
                  />
                ))}
              </ul>
            )}
            {hiddenSellouts > 0 && (
              <p className="text-xs text-neutral-500">
                {hiddenSellouts} likely sellout{hiddenSellouts === 1 ? '' : 's'} hidden
              </p>
            )}
          </section>

          <Field label="Notes" htmlFor={f('notes')} optional>
            <textarea
              id={f('notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
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
            {send && (
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
              {pending === 'save' ? 'Saving…' : send ? 'Save changes' : 'Add send'}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
