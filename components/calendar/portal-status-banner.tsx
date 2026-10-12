'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

const sinceFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatPortalSince(unixSeconds: number | null): string | null {
  if (unixSeconds == null || !Number.isFinite(unixSeconds)) return null
  return sinceFormat.format(new Date(unixSeconds * 1000))
}

export function PortalStatusBanner({ status, since }: { status: number | null; since: number | null }) {
  const [helpOpen, setHelpOpen] = useState(false)
  if (status !== 0) return null

  const sinceLabel = formatPortalSince(since) ?? 'the last successful sync'

  return (
    <>
      <div role="alert" className="w-full bg-red-600 text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-8">
          <p className="flex items-start gap-2 text-sm font-medium leading-relaxed">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="text-pretty">
              Portal connection lost. Ticket numbers and projections are frozen since {sinceLabel}.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="inline-flex h-9 shrink-0 items-center rounded-lg bg-white px-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-600"
          >
            How to fix
          </button>
        </div>
      </div>
      {helpOpen && <HowToFixPanel onClose={() => setHelpOpen(false)} />}
    </>
  )
}

function ExternalLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-600"
    >
      {href}
    </a>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
        {n}
      </span>
      <p className="text-sm leading-relaxed text-neutral-700">{children}</p>
    </li>
  )
}

function HowToFixPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close how to fix"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-neutral-900/30"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-fix-title"
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <h2 id="portal-fix-title" className="text-lg font-semibold text-neutral-900">
            How to fix the portal connection
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            autoFocus
            className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          <ol className="flex flex-col gap-4">
            <Step n={1}>
              On a computer, open <ExternalLink href="https://www.sofarsounds.com/admin/event-planner" /> and log in.
              Use the browser profile you keep for this, and don&apos;t log out afterward.
            </Step>
            <Step n={2}>
              Press F12. Go to Application (Chrome or Edge) or Storage (Firefox) → Cookies → sofarsounds.com.
            </Step>
            <Step n={3}>
              Find <code className="rounded bg-neutral-100 px-1 font-mono text-xs">_session_id</code> and copy its Value.
            </Step>
            <Step n={4}>
              Open{' '}
              <ExternalLink href="https://github.com/housesofgraffiti/sofar-scraper/settings/secrets/actions/SOFAR_COOKIE" />,
              click Update, and paste: <code className="rounded bg-neutral-100 px-1 font-mono text-xs">_session_id=</code>{' '}
              followed by the value (no spaces). Save.
            </Step>
            <Step n={5}>
              Come back here and press Sync now. The banner disappears once the sync succeeds (about a minute).
            </Step>
          </ol>

          <div className="flex flex-col gap-1 border-t border-neutral-100 pt-5">
            <h3 className="text-sm font-semibold text-neutral-900">Laptop shortcut</h3>
            <p className="text-sm leading-relaxed text-neutral-700">
              Double-click <code className="rounded bg-neutral-100 px-1 font-mono text-xs">update_cookie.bat</code> in
              the sofar-scraper folder and paste the value when asked.
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-neutral-100 pt-5">
            <h3 className="text-sm font-semibold text-neutral-900">If that doesn&apos;t work</h3>
            <p className="text-sm leading-relaxed text-neutral-700">Paste this into Claude Code:</p>
            <p className="select-all rounded-lg bg-neutral-100 p-3 text-sm leading-relaxed text-neutral-800">
              &ldquo;The portal cookie was refreshed but the hourly job still fails. Check the latest GitHub Actions run
              for housesofgraffiti/sofar-scraper and fix it.&rdquo;
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
