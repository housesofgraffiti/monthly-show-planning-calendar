'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { RefreshCw } from 'lucide-react'

const STATUS_URL = '/api/portal-sync'
const POLL_MS = 15_000
const SLOW_MS = 5 * 60 * 1000

type Phase = { kind: 'idle' } | { kind: 'syncing'; pressedAt: string } | { kind: 'slow' }
type Notice = { tone: 'info' | 'error'; text: string }

async function fetchStatus(url: string): Promise<{ syncedAt: string | null }> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Could not check sync status')
  return res.json()
}

export function SyncNowButton({ onSynced }: { onSynced?: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useSWR(phase.kind === 'syncing' ? STATUS_URL : null, fetchStatus, {
    refreshInterval: POLL_MS,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    dedupingInterval: 1000,
    onSuccess: (status) => {
      if (phase.kind !== 'syncing' || !status.syncedAt) return
      if (Date.parse(status.syncedAt) > Date.parse(phase.pressedAt)) {
        setPhase({ kind: 'idle' })
        onSynced?.()
      }
    },
  })

  useEffect(() => {
    if (phase.kind !== 'syncing') return
    const timer = setTimeout(() => setPhase({ kind: 'slow' }), SLOW_MS)
    return () => clearTimeout(timer)
  }, [phase])

  async function press() {
    setNotice(null)
    setPending(true)
    try {
      const res = await fetch(STATUS_URL, { method: 'POST' })
      const body: { pressedAt?: string; error?: string; retryAfterSeconds?: number } = await res
        .json()
        .catch(() => ({}))
      if (res.status === 202 && body.pressedAt) {
        setPhase({ kind: 'syncing', pressedAt: body.pressedAt })
      } else if (res.status === 429) {
        const minutes = Math.max(1, Math.ceil((body.retryAfterSeconds ?? 60) / 60))
        setNotice({ tone: 'info', text: `Synced recently, try again in ${minutes} min` })
      } else {
        setNotice({ tone: 'error', text: body.error ?? 'Could not start sync' })
      }
    } catch {
      setNotice({ tone: 'error', text: 'Could not start sync' })
    } finally {
      setPending(false)
    }
  }

  const syncing = phase.kind === 'syncing'

  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={press}
        disabled={pending || syncing}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-0.5 text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden />
        {syncing ? 'Syncing...' : 'Sync now'}
      </button>
      <span role="status" aria-live="polite" className="empty:hidden">
        {phase.kind === 'slow' && <span className="text-amber-600">Sync is taking longer than usual</span>}
        {notice && (
          <span className={notice.tone === 'error' ? 'text-red-600' : 'text-neutral-500'}>{notice.text}</span>
        )}
      </span>
    </span>
  )
}
