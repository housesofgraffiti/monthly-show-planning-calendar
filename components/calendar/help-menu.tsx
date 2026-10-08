'use client'

import { useEffect, useRef, useState } from 'react'

const menuItem =
  'flex h-9 w-full items-center rounded-lg px-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900'

export function HelpMenu({
  onTour,
  onFaq,
  onImport,
}: {
  onTour: () => void
  onFaq: () => void
  onImport?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (action: () => void) => {
    setOpen(false)
    // Let the menu leave the DOM before the tour measures the page.
    window.setTimeout(action, 80)
  }

  return (
    <div ref={rootRef} data-tour="help" className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Help"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex size-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-base font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
      >
        ?
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Help"
          className="absolute right-0 top-full z-30 mt-2 flex w-48 flex-col rounded-xl border border-neutral-200 bg-white p-1 shadow-lg"
        >
          <button type="button" role="menuitem" autoFocus onClick={() => choose(onTour)} className={menuItem}>
            Take the tour
          </button>
          <button type="button" role="menuitem" onClick={() => choose(onFaq)} className={menuItem}>
            FAQ
          </button>
          {onImport && (
            <button
              type="button"
              role="menuitem"
              onClick={() => choose(onImport)}
              className={`${menuItem} sm:hidden`}
            >
              Import from portal
            </button>
          )}
        </div>
      )}
    </div>
  )
}
