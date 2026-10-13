'use client'

import { useId, useState } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// Puts a small "i" next to a label. Tapping it reveals a one-line explanation right underneath,
// so it never runs off a narrow screen.
export function InfoLabel({
  info,
  children,
  className,
}: {
  info: string
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex min-w-0 items-center gap-1">
        {children}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          aria-label="What does this mean?"
          className="-my-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
        >
          <Info className="size-4" aria-hidden />
        </button>
      </div>
      {open && (
        <p id={id} className="text-pretty rounded-lg bg-neutral-100 px-3 py-2 text-xs leading-relaxed text-neutral-700">
          {info}
        </p>
      )}
    </div>
  )
}
