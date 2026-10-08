'use client'

import { useState } from 'react'
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, type OtherRevenueInput, type OtherRevenueLine } from '@/lib/shows'

type Props = {
  ym: string
  lines: OtherRevenueLine[]
  onSave: (input: OtherRevenueInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onCopy: () => Promise<{ copied: number; skipped: number }>
}

const inputCls =
  'h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900'
const iconBtn =
  'inline-flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:opacity-50'

export function OtherRevenuePanel({ ym, lines, onSave, onDelete, onCopy }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const total = lines.reduce((sum, l) => sum + l.amount, 0)

  const startEdit = (line?: OtherRevenueLine) => {
    setEditing(line?.id ?? 'new')
    setLabel(line?.label ?? '')
    setAmount(line ? String(line.amount) : '')
    setError(null)
    setNotice(null)
  }

  const cancel = () => {
    setEditing(null)
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
    if (label.trim() === '') return setError('Add a label')
    if (amount === '') return setError('Enter an amount')
    void run(async () => {
      await onSave({ id: editing === 'new' ? undefined : (editing ?? undefined), month: ym, label, amount: Number(amount) })
      setEditing(null)
    })
  }

  const copyForward = () =>
    run(async () => {
      const { copied, skipped } = await onCopy()
      setNotice(
        copied === 0
          ? 'Nothing new to copy.'
          : `Copied ${copied} to next month${skipped > 0 ? `, ${skipped} already there` : ''}.`,
      )
    })

  const editForm = (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 py-2">
      <input
        autoFocus
        aria-label="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Tinder sponsorship"
        maxLength={120}
        className={cn(inputCls, 'min-w-0 flex-1 basis-48')}
      />
      <div className="relative w-36">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">$</span>
        <input
          aria-label="Amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          placeholder="0"
          className={cn(inputCls, 'w-full pl-7 tabular-nums')}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={cancel} className="h-10 rounded-lg px-3 text-sm text-neutral-600 hover:bg-neutral-100">
        Cancel
      </button>
    </form>
  )

  return (
    <section aria-label="Other revenue" data-tour="other-revenue" className="flex flex-col gap-1 rounded-2xl border border-neutral-200 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-medium text-neutral-700">Other revenue</h2>
          <span className="text-sm tabular-nums text-neutral-900">{formatCurrency(total)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copyForward}
            disabled={pending || lines.length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50"
          >
            <Copy className="size-3.5" aria-hidden />
            Copy to next month
          </button>
          <button
            type="button"
            onClick={() => startEdit()}
            disabled={editing !== null}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50"
          >
            <Plus className="size-3.5" aria-hidden />
            Add
          </button>
        </div>
      </div>

      {lines.length === 0 && editing !== 'new' && (
        <p className="py-1 text-sm text-neutral-400">No other revenue this month (sponsorships, etc.).</p>
      )}

      <ul className="divide-y divide-neutral-100">
        {lines.map((line) =>
          editing === line.id ? (
            <li key={line.id}>{editForm}</li>
          ) : (
            <li key={line.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span className="min-w-0 truncate text-neutral-800">{line.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="tabular-nums text-neutral-900">{formatCurrency(line.amount)}</span>
                <button type="button" onClick={() => startEdit(line)} aria-label={`Edit ${line.label}`} className={iconBtn}>
                  <Pencil className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => run(() => onDelete(line.id))}
                  disabled={pending}
                  aria-label={`Delete ${line.label}`}
                  className={iconBtn}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </span>
            </li>
          ),
        )}
        {editing === 'new' && <li>{editForm}</li>}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" className="text-sm text-neutral-500">
          {notice}
        </p>
      )}
    </section>
  )
}
