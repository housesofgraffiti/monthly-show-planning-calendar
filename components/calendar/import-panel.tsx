'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { formatShortWeekday, monthTitle } from '@/lib/dates'
import type { ImportCandidate, ImportChoice, ImportResult } from '@/lib/portal'

type Props = {
  ym: string
  getCandidates: (ym: string) => Promise<ImportCandidate[]>
  onImport: (choices: ImportChoice[]) => Promise<ImportResult>
  onClose: () => void
  onDone: (result: ImportResult) => void
}

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function ImportPanel({ ym, getCandidates, onImport, onClose, onDone }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [forceCreate, setForceCreate] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const { data, error: loadError, isLoading } = useSWR(['portal-import', ym], () => getCandidates(ym), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 0,
  })

  const candidates = data ?? []
  const selected = candidates.filter((c) => !skipped.has(c.eventId))
  const { month, year } = monthTitle(ym)

  const toggle = (eventId: string) =>
    setSkipped((prev) => {
      const next = new Set(prev)
      if (!next.delete(eventId)) next.add(eventId)
      return next
    })

  const setMode = (eventId: string, mode: 'link' | 'create') =>
    setForceCreate((prev) => {
      const next = new Set(prev)
      if (mode === 'create') next.add(eventId)
      else next.delete(eventId)
      return next
    })

  const submit = async () => {
    setError(null)
    setPending(true)
    try {
      const choices: ImportChoice[] = selected.map((c) =>
        c.existing && !forceCreate.has(c.eventId)
          ? { eventId: c.eventId, action: 'link', showId: c.existing.id }
          : { eventId: c.eventId, action: 'create' },
      )
      onDone(await onImport(choices))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import from the portal.')
      setPending(false)
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto max-h-[min(92dvh,48rem)] w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-3xl bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-900/30 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 pb-5 pt-6 sm:px-8">
          <div className="flex flex-col gap-1">
            <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight">
              Import from portal
            </h2>
            <p className="text-sm text-neutral-500">
              Published portal events in {month} {year} that are not linked to a show yet.
            </p>
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

        <div className="overflow-y-auto px-2 py-2 sm:px-4">
          {isLoading && <p className="px-4 py-8 text-sm text-neutral-500">Loading portal events…</p>}
          {loadError && (
            <p role="alert" className="px-4 py-8 text-sm text-red-600">
              {loadError instanceof Error ? loadError.message : 'Could not load portal events.'}
            </p>
          )}
          {!isLoading && !loadError && candidates.length === 0 && (
            <p className="px-4 py-8 text-sm text-neutral-500">Nothing new to import for {month}.</p>
          )}
          <ul className="flex flex-col">
            {candidates.map((c) => {
              const checked = !skipped.has(c.eventId)
              const linking = c.existing != null && !forceCreate.has(c.eventId)
              const rowId = `${id}-${c.eventId}`
              return (
                <li key={c.eventId} className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-neutral-50">
                  <input
                    id={rowId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.eventId)}
                    className="mt-1 size-4 shrink-0 accent-neutral-900"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <label htmlFor={rowId} className="flex cursor-pointer flex-wrap items-baseline gap-x-4 gap-y-0.5 text-[15px]">
                      <span className="font-medium tabular-nums">{shortDate(c.date)}</span>
                      <span className="text-neutral-500">{formatShortWeekday(c.date)}</span>
                      <span className="min-w-0 truncate">{c.venue || 'No venue'}</span>
                      <span className="ml-auto text-sm tabular-nums text-neutral-500">
                        {c.ticketsAvailable ?? '—'} tickets
                      </span>
                    </label>
                    {c.existing && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className={cn(linking ? 'text-neutral-900' : 'text-neutral-400')}>
                          Link to existing: {c.existing.format}
                          {c.existing.venue ? ` at ${c.existing.venue}` : ''}
                        </span>
                        <select
                          aria-label={`Action for ${c.venue || c.eventId} on ${shortDate(c.date)}`}
                          value={linking ? 'link' : 'create'}
                          onChange={(e) => setMode(c.eventId, e.target.value as 'link' | 'create')}
                          disabled={!checked}
                          className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-700 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:opacity-50"
                        >
                          <option value="link">Link to existing</option>
                          <option value="create">Create new</option>
                        </select>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-100 px-6 py-5 sm:px-8">
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-xl px-5 text-[15px] text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || selected.length === 0}
              className="h-12 rounded-xl bg-neutral-900 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? 'Importing…' : `Import ${selected.length} ${selected.length === 1 ? 'show' : 'shows'}`}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
