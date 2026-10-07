'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { ACCESS_COOKIE, accessTokenFor, hasTeamAccess, safeEqual } from '@/lib/team-access'
import { monthBounds } from '@/lib/dates'
import type {
  ImportCandidate,
  ImportChoice,
  ImportResult,
  PortalMap,
  PortalMatch,
  PortalSuggestion,
} from '@/lib/portal'
import {
  DATE_RE,
  isUuid,
  MONTH_RE,
  validateShowInput,
  type MonthData,
  type Show,
} from '@/lib/shows'

type ShowRow = {
  id: string
  show_date: string
  category: Show['category']
  format: string
  area: string | null
  venue: string | null
  tickets: number | null
  ticket_price: number | string | null
  projected_revenue: number | string | null
  status: Show['status']
  region: Show['region']
  organized_by: Show['organizedBy']
  portal_event_id: string | null
  notes: string | null
}

const BASE_SHOW_COLUMNS =
  'id, show_date, category, format, area, venue, tickets, ticket_price, projected_revenue, status, portal_event_id, notes'
const SHOW_COLUMNS = `${BASE_SHOW_COLUMNS}, region, organized_by`

const toNum = (v: number | string | null) => (v == null ? null : Number(v))

// The region/organized_by columns are added by scripts/002_add_region_organized_by.sql.
// Until that migration runs, fall back to the base column set so the app keeps working
// and simply defaults those two fields instead of erroring.
function isMissingNewColumns(error: { code?: string; message?: string } | null) {
  if (!error) return false
  if (error.code === '42703') return true
  const msg = error.message ?? ''
  return msg.includes('region') || msg.includes('organized_by')
}

function fromRow(row: ShowRow): Show {
  return {
    id: row.id,
    date: row.show_date,
    category: row.category,
    format: row.format,
    area: row.area ?? '',
    venue: row.venue ?? '',
    tickets: row.tickets,
    ticketPrice: toNum(row.ticket_price),
    projectedRevenue: toNum(row.projected_revenue),
    status: row.status,
    region: row.region ?? 'LA',
    organizedBy: row.organized_by ?? 'Sofar',
    portalEventId: row.portal_event_id ?? '',
    notes: row.notes ?? '',
  }
}

async function requireAccess() {
  if (!(await hasTeamAccess())) throw new Error('Not authorized. Reload and enter the team passcode.')
}

function assertMonth(ym: unknown): asserts ym is string {
  if (typeof ym !== 'string' || !MONTH_RE.test(ym)) throw new Error('Invalid month')
}

export async function verifyPasscode(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const expected = process.env.TEAM_PASSCODE
  const attempt = String(formData.get('passcode') ?? '')
  if (!expected || !safeEqual(accessTokenFor(attempt), accessTokenFor(expected))) {
    await new Promise((r) => setTimeout(r, 600))
    return { error: 'That passcode is not right. Try again.' }
  }
  ;(await cookies()).set(ACCESS_COOKIE, accessTokenFor(expected), {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  redirect('/')
}

export async function getMonthData(ym: string): Promise<MonthData> {
  await requireAccess()
  assertMonth(ym)
  const { start, end } = monthBounds(ym)
  const supabase = getSupabaseAdmin()

  let [showsRes, targetRes] = await Promise.all([
    supabase
      .from('shows')
      .select(SHOW_COLUMNS)
      .gte('show_date', start)
      .lt('show_date', end)
      .order('show_date')
      .order('created_at'),
    supabase.from('monthly_targets').select('target').eq('month', start).maybeSingle(),
  ])
  let showsData: unknown = showsRes.data
  let showsError = showsRes.error
  if (showsError && isMissingNewColumns(showsError)) {
    const fallback = await supabase
      .from('shows')
      .select(BASE_SHOW_COLUMNS)
      .gte('show_date', start)
      .lt('show_date', end)
      .order('show_date')
      .order('created_at')
    showsData = fallback.data
    showsError = fallback.error
  }
  if (showsError) throw new Error(showsError.message)
  if (targetRes.error) throw new Error(targetRes.error.message)

  const shows = ((showsData ?? []) as ShowRow[]).map(fromRow)
  const eventIds = [...new Set(shows.map((s) => s.portalEventId.trim()).filter(Boolean))]
  const [portal, portalSyncedAt] = await Promise.all([readPortalMatches(eventIds), readLatestPortalSync()])

  return {
    shows,
    target: targetRes.data ? Number(targetRes.data.target) : null,
    portal,
    portalSyncedAt,
  }
}

type PortalEventRow = {
  event_id: string
  tickets_available: number | string | null
  confirmed: number | string | null
  revenue_cents: number | string | null
  synced_at: string | null
}

type ProjectionRow = {
  event_id: string
  projected_tickets: number | string | null
  low: number | string | null
  high: number | string | null
  projected_revenue_cents: number | string | null
  confidence: string | null
  pace_label: string | null
  computed_at: string | null
}

const centsToDollars = (v: number | string | null) => (v == null ? null : Number(v) / 100)

// portal_events and projections are read-only here. Any read failure degrades to
// "no portal data" so the calendar keeps working exactly as before.
async function readPortalMatches(eventIds: string[]): Promise<PortalMap> {
  const portal: PortalMap = {}
  if (eventIds.length === 0) return portal
  const supabase = getSupabaseAdmin()

  const [eventsRes, projectionsRes] = await Promise.all([
    supabase
      .from('portal_events')
      .select('event_id, tickets_available, confirmed, revenue_cents, synced_at')
      .in('event_id', eventIds)
      .order('synced_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('projections')
      .select('event_id, projected_tickets, low, high, projected_revenue_cents, confidence, pace_label, computed_at')
      .in('event_id', eventIds)
      .order('computed_at', { ascending: false, nullsFirst: false }),
  ])

  const entry = (id: string): PortalMatch =>
    (portal[id] ??= { eventId: id, hasEvent: false, confirmed: null, ticketsAvailable: null, revenue: null, projection: null })

  if (eventsRes.error) console.error('Could not read portal_events:', eventsRes.error.message)
  for (const row of (eventsRes.data ?? []) as PortalEventRow[]) {
    const match = entry(row.event_id)
    if (match.hasEvent) continue
    match.hasEvent = true
    match.confirmed = toNum(row.confirmed)
    match.ticketsAvailable = toNum(row.tickets_available)
    match.revenue = centsToDollars(row.revenue_cents)
  }

  if (projectionsRes.error) console.error('Could not read projections:', projectionsRes.error.message)
  for (const row of (projectionsRes.data ?? []) as ProjectionRow[]) {
    const match = entry(row.event_id)
    if (match.projection) continue
    match.projection = {
      tickets: toNum(row.projected_tickets),
      low: toNum(row.low),
      high: toNum(row.high),
      revenue: centsToDollars(row.projected_revenue_cents),
      confidence: row.confidence,
      paceLabel: row.pace_label,
      computedAt: row.computed_at,
    }
  }
  return portal
}

async function readLatestPortalSync(): Promise<string | null> {
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

export async function getPortalSuggestions(date: unknown): Promise<PortalSuggestion[]> {
  await requireAccess()
  if (typeof date !== 'string' || !DATE_RE.test(date)) return []
  const { data, error } = await getSupabaseAdmin()
    .from('portal_events')
    .select('event_id, venue')
    .eq('show_date', date)
    .order('event_id')
    .limit(25)
  if (error) {
    console.error('Could not read portal suggestions:', error.message)
    return []
  }
  return (data as { event_id: string; venue: string | null }[]).map((r) => ({
    eventId: r.event_id,
    venue: r.venue ?? '',
  }))
}

type ImportEventRow = {
  event_id: string
  show_date: string
  venue: string | null
  tickets_available: number | string | null
  organized_as: string | null
}

type UnlinkedShowRow = {
  id: string
  show_date: string
  format: string
  venue: string | null
  portal_event_id: string | null
}

// Reads portal_events and projections, never writes to them.
async function findImportCandidates(ym: string): Promise<ImportCandidate[]> {
  const { start, end } = monthBounds(ym)
  const supabase = getSupabaseAdmin()

  const eventsRes = await supabase
    .from('portal_events')
    .select('event_id, show_date, venue, tickets_available, organized_as')
    .eq('status', 'published')
    .gte('show_date', start)
    .lt('show_date', end)
    .order('show_date')
    .order('event_id')
  if (eventsRes.error) throw new Error(eventsRes.error.message)
  const events = (eventsRes.data ?? []) as ImportEventRow[]
  if (events.length === 0) return []
  const ids = events.map((e) => e.event_id)

  const [linkedRes, monthShowsRes, projectionsRes] = await Promise.all([
    supabase.from('shows').select('portal_event_id').in('portal_event_id', ids),
    supabase
      .from('shows')
      .select('id, show_date, format, venue, portal_event_id')
      .gte('show_date', start)
      .lt('show_date', end)
      .order('show_date')
      .order('created_at'),
    supabase
      .from('projections')
      .select('event_id, projected_revenue_cents, computed_at')
      .in('event_id', ids)
      .order('computed_at', { ascending: false, nullsFirst: false }),
  ])
  if (linkedRes.error) throw new Error(linkedRes.error.message)
  if (monthShowsRes.error) throw new Error(monthShowsRes.error.message)
  if (projectionsRes.error) throw new Error(projectionsRes.error.message)

  const linkedIds = new Set(
    ((linkedRes.data ?? []) as { portal_event_id: string | null }[]).map((r) => r.portal_event_id),
  )

  const unlinkedByDate = new Map<string, UnlinkedShowRow[]>()
  for (const row of (monthShowsRes.data ?? []) as UnlinkedShowRow[]) {
    if (row.portal_event_id) continue
    unlinkedByDate.set(row.show_date, [...(unlinkedByDate.get(row.show_date) ?? []), row])
  }

  const projectedCents = new Map<string, number>()
  for (const row of (projectionsRes.data ?? []) as {
    event_id: string
    projected_revenue_cents: number | string | null
  }[]) {
    if (!projectedCents.has(row.event_id) && row.projected_revenue_cents != null) {
      projectedCents.set(row.event_id, Number(row.projected_revenue_cents))
    }
  }

  const candidates: ImportCandidate[] = []
  for (const event of events) {
    if (linkedIds.has(event.event_id)) continue
    // Each existing show can be offered to only one event.
    const match = unlinkedByDate.get(event.show_date)?.shift()
    const cents = projectedCents.get(event.event_id)
    candidates.push({
      eventId: event.event_id,
      date: event.show_date,
      venue: event.venue ?? '',
      ticketsAvailable: toNum(event.tickets_available),
      projectedRevenue: cents == null ? null : cents / 100,
      organizedBy: /producer/i.test(event.organized_as ?? '') ? 'Local Producer' : 'Sofar',
      existing: match ? { id: match.id, format: match.format, venue: match.venue ?? '' } : null,
    })
  }
  return candidates
}

export async function getImportCandidates(ym: string): Promise<ImportCandidate[]> {
  await requireAccess()
  assertMonth(ym)
  return findImportCandidates(ym)
}

export async function importFromPortal(ym: string, raw: unknown): Promise<ImportResult> {
  await requireAccess()
  assertMonth(ym)
  if (!Array.isArray(raw) || raw.length > 500) throw new Error('Invalid import selection')

  const choices = new Map<string, ImportChoice>()
  for (const item of raw) {
    const c = item as Partial<ImportChoice> | null
    if (
      !c ||
      typeof c.eventId !== 'string' ||
      c.eventId.length > 120 ||
      (c.action !== 'create' && c.action !== 'link') ||
      (c.showId !== undefined && !isUuid(c.showId))
    ) {
      throw new Error('Invalid import selection')
    }
    choices.set(c.eventId, c as ImportChoice)
  }

  // Re-derive candidates so anything linked or changed since the panel opened is skipped.
  const candidates = await findImportCandidates(ym)
  const result: ImportResult = { created: 0, linked: 0, skipped: 0 }
  const toCreate: ImportCandidate[] = []
  const toLink: { showId: string; eventId: string }[] = []

  for (const choice of choices.values()) {
    const candidate = candidates.find((c) => c.eventId === choice.eventId)
    if (!candidate) {
      result.skipped++
    } else if (choice.action === 'create') {
      toCreate.push(candidate)
    } else if (candidate.existing && candidate.existing.id === choice.showId) {
      toLink.push({ showId: candidate.existing.id, eventId: candidate.eventId })
    } else {
      result.skipped++
    }
  }

  const supabase = getSupabaseAdmin()

  if (toCreate.length > 0) {
    const rows = toCreate.map((c) => ({
      show_date: c.date,
      category: 'Core',
      format: 'Discovery',
      venue: c.venue || null,
      tickets: c.ticketsAvailable,
      projected_revenue: c.projectedRevenue,
      status: 'Confirmed',
      region: 'LA',
      organized_by: c.organizedBy,
      portal_event_id: c.eventId,
      notes: 'Imported from portal. Check format and price.',
    }))
    let { error } = await supabase.from('shows').insert(rows)
    if (error && isMissingNewColumns(error)) {
      ;({ error } = await supabase
        .from('shows')
        .insert(rows.map(({ region, organized_by, ...base }) => base)))
    }
    if (error) throw new Error(error.message)
    result.created = rows.length
  }

  for (const link of toLink) {
    const { data, error } = await supabase
      .from('shows')
      .update({ portal_event_id: link.eventId })
      .eq('id', link.showId)
      .is('portal_event_id', null)
      .select('id')
    if (error) throw new Error(error.message)
    if (data && data.length > 0) result.linked++
    else result.skipped++
  }

  return result
}

export async function saveShow(raw: unknown): Promise<Show> {
  await requireAccess()
  const input = validateShowInput(raw)
  const row = {
    show_date: input.date,
    category: input.category,
    format: input.format,
    area: input.area || null,
    venue: input.venue || null,
    tickets: input.tickets,
    ticket_price: input.ticketPrice,
    projected_revenue: input.projectedRevenue,
    status: input.status,
    region: input.region,
    organized_by: input.organizedBy,
    portal_event_id: input.portalEventId || null,
    notes: input.notes || null,
  }
  const supabase = getSupabaseAdmin()
  const runSave = (payload: Record<string, unknown>, columns: string) => {
    const query = input.id
      ? supabase.from('shows').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', input.id)
      : supabase.from('shows').insert(payload)
    return query.select(columns).single()
  }

  let { data, error } = await runSave(row, SHOW_COLUMNS)
  if (error && isMissingNewColumns(error)) {
    const { region, organized_by, ...baseRow } = row
    ;({ data, error } = await runSave(baseRow, BASE_SHOW_COLUMNS))
  }
  if (error) throw new Error(error.message)
  return fromRow(data as unknown as ShowRow)
}

export async function deleteShow(id: unknown): Promise<void> {
  await requireAccess()
  if (!isUuid(id)) throw new Error('Invalid id')
  const { error } = await getSupabaseAdmin().from('shows').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function saveMonthlyTarget(ym: string, target: unknown): Promise<void> {
  await requireAccess()
  assertMonth(ym)
  const value = Number(target)
  if (!Number.isFinite(value) || value < 0 || value > 100_000_000) throw new Error('Invalid target')
  const { error } = await getSupabaseAdmin()
    .from('monthly_targets')
    .upsert(
      { month: `${ym}-01`, target: Math.round(value * 100) / 100, updated_at: new Date().toISOString() },
      { onConflict: 'month' },
    )
  if (error) throw new Error(error.message)
}
