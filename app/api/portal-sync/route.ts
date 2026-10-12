import { isSupabaseConfigured } from '@/lib/supabase-admin'
import { hasTeamAccess } from '@/lib/team-access'
import {
  SyncTableMissingError,
  claimSyncSlot,
  dispatchSyncWorkflow,
  githubSyncConfig,
  readLatestSyncedAt,
  releaseSyncSlot,
} from '@/lib/portal-sync'

const noStore = { 'Cache-Control': 'no-store' }

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: noStore })
}

export async function GET() {
  if (!(await hasTeamAccess())) return json({ error: 'Not signed in' }, 401)
  if (!isSupabaseConfigured()) return json({ syncedAt: null }, 200)
  return json({ syncedAt: await readLatestSyncedAt() }, 200)
}

export async function POST() {
  if (!(await hasTeamAccess())) return json({ error: 'Not signed in' }, 401)
  if (!isSupabaseConfigured()) return json({ error: 'Sync is not available' }, 503)

  const config = githubSyncConfig()
  if (!config) {
    console.error('Sync now is missing GITHUB_REPO, GITHUB_WORKFLOW or GITHUB_TOKEN')
    return json({ error: 'Sync is not configured' }, 500)
  }

  let claim
  try {
    claim = await claimSyncSlot()
  } catch (error) {
    if (error instanceof SyncTableMissingError) return json({ error: error.message }, 500)
    console.error('Could not check sync limit:', error instanceof Error ? error.message : error)
    return json({ error: 'Could not start sync' }, 500)
  }

  if (!claim.ok) {
    return json({ error: 'rate_limited', retryAfterSeconds: claim.retryAfterSeconds }, 429)
  }

  const result = await dispatchSyncWorkflow(config)
  if (!result.ok) {
    await releaseSyncSlot(claim)
    return json({ error: result.message }, 502)
  }

  return json({ pressedAt: claim.pressedAt }, 202)
}
