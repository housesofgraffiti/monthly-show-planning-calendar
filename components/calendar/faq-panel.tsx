'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FAQ } from '@/lib/faq'

export function FaqPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const searching = query.trim().length > 0
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return FAQ.map((item, index) => ({ item, index })).filter(
      ({ item }) => !needle || `${item.question} ${item.answer}`.toLowerCase().includes(needle),
    )
  }, [query])

  const toggle = (index: number) =>
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close FAQ"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-neutral-900/30"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="FAQ"
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">FAQ</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="border-b border-neutral-100 px-5 py-3">
          <label className="relative block">
            <span className="sr-only">Search the FAQ</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          {matches.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">
              No questions match &ldquo;{query.trim()}&rdquo;. Ask Ben.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {matches.map(({ item, index }) => {
                const expanded = searching || openItems.has(index)
                return (
                  <li key={item.question}>
                    <h3>
                      <button
                        type="button"
                        onClick={() => toggle(index)}
                        aria-expanded={expanded}
                        aria-controls={`faq-answer-${index}`}
                        className="flex w-full items-start justify-between gap-3 rounded-lg py-3.5 text-left text-sm font-medium text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                      >
                        <span className="text-pretty">{item.question}</span>
                        <ChevronDown
                          className={cn('mt-0.5 size-4 shrink-0 text-neutral-400 transition-transform', expanded && 'rotate-180')}
                          aria-hidden
                        />
                      </button>
                    </h3>
                    {expanded && (
                      <p id={`faq-answer-${index}`} className="pb-4 pr-6 text-sm leading-relaxed text-neutral-600">
                        {item.answer}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
