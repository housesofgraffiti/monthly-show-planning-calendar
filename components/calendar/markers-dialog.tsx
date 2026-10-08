'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatLongDate } from '@/lib/dates'
import { MARKER_TYPES, markersForMonth, type DayMarker, type DayMarkerInput, type MarkerType } from '@/lib/markers'

type Props = {
  ym: string
  markers: DayMarker[]
  onSave: (input: DayMarkerInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

const inputCls =
  'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-[15px] text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900'
const iconBtn =
  'inline-flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:opacity-50'

export function MarkersDialog({ ym, markers, onSave, onDelete, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const f = (name: string) => `${id}-${name}`

  const [editingId, setEditingId] = useState<string | undefined>()
  const [date, setDate] = useState(`${ym}-01`)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<MarkerType>('event')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const list = markersForMonth(ym, markers)

  const reset = () => {
    setEditingId(undefined)
    setDate(`${ym}-01`)
    setLabel('')
    setType('event')
    setNote('')
  }

  const edit = (m: DayMarker) => {
    setEditingId(m.id)
    setDate(m.date)
    setLabel(m.label)
    setType(m.type)
    setNote(m.note)
    setError(null)
  }

  const run = async (fn: () => Promise<void>) => {
    setPending(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setPending(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    void run(async () => {
      await onSave({ id: editingId, date, label, type, note })
      reset()
    })
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
      className="m-auto max-h-[min(92dvh,44rem)] w-[calc(100%-1.5rem)] max-w-lg overflow-hidden rounded-3xl max-sm:mb-0 max-sm:max-h-[94dvh] max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-neutral-900/30 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 pb-4 pt-6">
          <div className="flex flex-col gap-1">
            <h2 id={f('title')} className="text-xl font-semibold tracking-tight">
              Day markers
            </h2>
            <p className="text-sm text-neutral-500">Holidays are built in. Add your own events below.</p>
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

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
          {list.length === 0 ? (
            <p className="text-sm text-neutral-400">No markers this month.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {list.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn('size-2 shrink-0 rounded-full', m.type === 'event' ? 'bg-amber-500' : 'bg-neutral-400')}
                        aria-hidden
                      />
                      <span className="truncate font-medium text-neutral-900">{m.label}</span>
                      {m.builtIn && <span className="text-xs text-neutral-400">built in</span>}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {formatLongDate(m.date)}
                      {m.note && ` · ${m.note}`}
                    </span>
                  </div>
                  {!m.builtIn && (
                    <span className="flex shrink-0 items-center">
                      <button type="button" onClick={() => edit(m)} aria-label={`Edit ${m.label}`} className={iconBtn}>
                        <Pencil className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => run(() => onDelete(m.id))}
                        disabled={pending}
                        aria-label={`Delete ${m.label}`}
                        className={iconBtn}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="text-sm font-medium text-neutral-700">{editingId ? 'Edit marker' : 'Add marker'}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={f('date')} className="text-xs font-medium text-neutral-600">
                  Date
                </label>
                <input id={f('date')} type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={f('type')} className="text-xs font-medium text-neutral-600">
                  Type
                </label>
                <select
                  id={f('type')}
                  value={type}
                  onChange={(e) => setType(e.target.value as MarkerType)}
                  className={cn(inputCls, 'capitalize')}
                >
                  {MARKER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={f('label')} className="text-xs font-medium text-neutral-600">
                Label
              </label>
              <input
                id={f('label')}
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Dodgers playoffs"
                maxLength={80}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={f('note')} className="text-xs font-medium text-neutral-600">
                Note <span className="font-normal text-neutral-400">optional</span>
              </label>
              <input id={f('note')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={inputCls} />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={pending}
                className="h-11 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {pending ? 'Saving…' : editingId ? 'Save marker' : 'Add marker'}
              </button>
              {editingId && (
                <button type="button" onClick={reset} className="h-11 rounded-xl px-4 text-sm text-neutral-600 hover:bg-neutral-100">
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </dialog>
  )
}
