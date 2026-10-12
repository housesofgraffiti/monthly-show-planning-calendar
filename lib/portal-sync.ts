import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const SYNC_WINDOW_MS = 5 * 60 * 1000

const EPOCH = '1970-01-01T00:00:00.000Z'

export const SYNC_TABLE_HINT =
  'Sync limit needs a new database table. Run scripts/009_add_portal_sync_requests.sql in Supabase, then try again.'

type PgError = { code?: string; message: string }

export class SyncTableMissingError extends Error {
  constructor() {
    super(SYNC_TABLE_HINT)
  }
}

function check(error: PgError | null) {
  if (!error) return
  if (error.code === '42P01' || error.code === 'PGRST205') throw new SyncTableMissingError()
  throw new Error(error.message)
}

export type SyncClaim =
  | { ok: true; pressedAt: string; previous: string }
  | { ok: false; retryAfterSeconds: number }

async function readLastPress(): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from('portal_sync_requests')
    .select('last_pressed_at')
    .eq('id', 1)
    .maybeSingle()
  check(error)
  return data?.last_pressed_at ?? EPOCH
}

function retryAfter(lastPressedAt: string, now: number) {
  const remainingMs = Date.parse(lastPressedAt) + SYNC_WINDOW_MS - now
  return Math.max(1, Math.ceil(remainingMs / 1000))
}

// The update only matches when the previous press is outside the window, so two people
// pressing at the same moment cannot both claim the slot.
export async function claimSyncSlot(): Promise<SyncClaim> {
  const supabase = getSupabaseAdmin()
  const seeded = await supabase
    .from('portal_sync_requests')
    .upsert({ id: 1, last_pressed_at: EPOCH }, { onConflict: 'id', ignoreDuplicates: true })
  check(seeded.error)

  const previous = await readLastPress()
  const now = Date.now()
  if (Date.parse(previous) > now - SYNC_WINDOW_MS) {
    return { ok: false, retryAfterSeconds: retryAfter(previous, now) }
  }

  const pressedAt = new Date(now).toISOString()
  const { data, error } = await supabase
    .from('portal_sync_requests')
    .update({ last_pressed_at: pressedAt })
    .eq('id', 1)
    .lte('last_pressed_at', new Date(now - SYNC_WINDOW_MS).toISOString())
    .select('last_pressed_at')
  check(error)

  if (!data || data.length === 0) {
    const latest = await readLastPress()
    return { ok: false, retryAfterSeconds: retryAfter(latest, Date.now()) }
  }
  return { ok: true, pressedAt, previous }
}

export async function releaseSyncSlot(claim: { pressedAt: string; previous: string }) {
  const { error } = await getSupabaseAdmin()
    .from('portal_sync_requests')
    .update({ last_pressed_at: claim.previous })
    .eq('id', 1)
    .eq('last_pressed_at', claim.pressedAt)
  if (error) console.error('Could not release sync slot:', error.message)
}

export async function readLatestSyncedAt(): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('portal_events')
    .select('synced_at')
    .not('synced_at', 'is', null)
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('Could not read portal sync time:', error.message)
    return null
  }
  return data?.synced_at ?? null
}

export type DispatchResult = { ok: true } | { ok: false; message: string }

// GITHUB_* values are read here on the server only and never returned to the browser.
export function githubSyncConfig() {
  const repo = process.env.GITHUB_REPO
  const workflow = process.env.GITHUB_WORKFLOW
  const token = process.env.GITHUB_TOKEN
  if (!repo || !workflow || !token) return null
  return { repo, workflow, token }
}

export async function dispatchSyncWorkflow(config: NonNullable<ReturnType<typeof githubSyncConfig>>): Promise<DispatchResult> {
  const url = `https://api.github.com/repos/${config.repo}/actions/workflows/${encodeURIComponent(config.workflow)}/dispatches`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (res.status === 204) return { ok: true }
    console.error('GitHub workflow dispatch failed with status', res.status)
    return { ok: false, message: `Could not start sync (GitHub ${res.status})` }
  } catch (error) {
    console.error('GitHub workflow dispatch failed:', error instanceof Error ? error.message : error)
    return { ok: false, message: 'Could not start sync' }
  }
}
