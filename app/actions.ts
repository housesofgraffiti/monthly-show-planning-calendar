'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { ACCESS_COOKIE, accessTokenFor, hasTeamAccess, safeEqual } from '@/lib/team-access'
import { monthBounds } from '@/lib/dates'
import {
  resolveConfidence,
  type ImportCandidate,
  type ImportChoice,
  type ImportResult,
  type PortalMap,
  type PortalMatch,
  type PortalSuggestion,
} from '@/lib/portal'
import {
  DATE_RE,
  isUuid,
  MONTH_RE,
  validateOtherRevenueInput,
  validateShowInput,
  type MonthData,
  type OtherRevenueLine,
  type SaveShowResult,
  type Show,
} from '@/lib/shows'
import { validateMarkerInput, type DayMarker } from '@/lib/markers'
import { validateSendInput, type Send } from '@/lib/sends'

const NEW_FIELDS_HINT =
  'This needs the new database columns/tables. Run scripts/003_add_revenue_and_markers.sql in Supabase, then try again.'
const EVENT_PLANNER_HINT =
  'Event planner needs a new database column. Run scripts/004_add_event_planner.sql in Supabase, then try again.'
const ADJUSTMENT_HINT =
  'Your estimate needs new database columns. Run scripts/005_add_projection_adjustments.sql in Supabase, then try again.'
const MERCHANDISED_HINT =
  'Merchandised needs a new database column. Run scripts/007_add_merchandised.sql in Supabase, then try again.'

const SENDS_HINT =
  'Marketing sends need a new database table. Run scripts/006_add_marketing_sends.sql in Supabase, then try again.'

type PgError = { code?: string; message: string }
type PgResult = { data: unknown; error: PgError | null }

function writeError(error: PgError) {
  if (error.code === '42P01' || error.code === 'PGRST205') return new Error(NEW_FIELDS_HINT)
  return new Error(error.message)
}

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
  venue_fee: number | string | null
  merch: boolean | null
  event_planner: boolean | null
  merchandised: boolean | null
  revenue_type: Show['revenueType'] | null
  flat_fee: number | string | null
  portal_event_id: string | null
  notes: string | null
  adjusted_total: number | string | null
  adjustment_reason: Show['adjustmentReason']
  adjustment_note: string | null
  model_total_at_adjustment: number | string | null
  updated_at: string | null
  updated_by: string | null
}

const BASE_SHOW_COLUMNS =
  'id, show_date, category, format, area, venue, tickets, ticket_price, projected_revenue, status, portal_event_id, notes, updated_at'
const REGION_SHOW_COLUMNS = `${BASE_SHOW_COLUMNS}, region, organized_by`
const REVENUE_SHOW_COLUMNS = `${REGION_SHOW_COLUMNS}, venue_fee, merch, revenue_type, flat_fee`
const EVENT_PLANNER_SHOW_COLUMNS = `${REVENUE_SHOW_COLUMNS}, event_planner`
const MERCHANDISED_SHOW_COLUMNS = `${EVENT_PLANNER_SHOW_COLUMNS}, merchandised`
const SHOW_COLUMNS = `${MERCHANDISED_SHOW_COLUMNS}, adjusted_total, adjustment_reason, adjustment_note, model_total_at_adjustment`
const AUTHOR_SHOW_COLUMNS = `${SHOW_COLUMNS}, updated_by`

const toNum = (v: number | string | null) => (v == null ? null : Number(v))

// Newer columns come from scripts/002 to 005. Until those migrations run, retry with
// the older column sets so the app keeps working and just defaults the missing fields.
type ColumnTier = { columns: string; omit: string[] }
const REVENUE_COLUMNS = ['venue_fee', 'merch', 'revenue_type', 'flat_fee']
const ADJUSTMENT_COLUMNS = ['adjusted_total', 'adjustment_reason', 'adjustment_note', 'model_total_at_adjustment']
const MERCHANDISED_COLUMNS = ['merchandised']
const AUTHOR_COLUMNS = ['updated_by']
const COLUMN_TIERS: ColumnTier[] = [
  { columns: AUTHOR_SHOW_COLUMNS, omit: [] },
  { columns: SHOW_COLUMNS, omit: AUTHOR_COLUMNS },
  { columns: MERCHANDISED_SHOW_COLUMNS, omit: [...AUTHOR_COLUMNS, ...ADJUSTMENT_COLUMNS] },
  { columns: EVENT_PLANNER_SHOW_COLUMNS, omit: [...AUTHOR_COLUMNS, ...ADJUSTMENT_COLUMNS, ...MERCHANDISED_COLUMNS] },
  {
    columns: REVENUE_SHOW_COLUMNS,
    omit: [...AUTHOR_COLUMNS, ...ADJUSTMENT_COLUMNS, MERCHANDISED_COLUMNS[0], 'event_planner'],
  },
  {
    columns: REGION_SHOW_COLUMNS,
    omit: [...AUTHOR_COLUMNS, ...ADJUSTMENT_COLUMNS, ...MERCHANDISED_COLUMNS, ...REVENUE_COLUMNS, 'event_planner'],
  },
  {
    columns: BASE_SHOW_COLUMNS,
    omit: [
      ...AUTHOR_COLUMNS,
      ...ADJUSTMENT_COLUMNS,
      ...MERCHANDISED_COLUMNS,
      ...REVENUE_COLUMNS,
      'event_planner',
      'region',
      'organized_by',
    ],
  },
]

function isMissingColumns(error: PgError | null) {
  if (!error) return false
  if (error.code === '42703' || error.code === 'PGRST204') return true
  return /region|organized_by|venue_fee|merchandised|merch|event_planner|revenue_type|flat_fee|adjusted_total|adjustment_|model_total|updated_by/.test(
    error.message,
  )
}

// Read-only: the model's latest projected total for a portal event. Nothing here writes to
// projections or portal_events.
async function readModelTotal(eventId: string): Promise<number | null> {
  if (!eventId) return null
  const supabase = getSupabaseAdmin()
  const read = (columns: string) =>
    supabase
      .from('projections')
      .select(columns)
      .eq('event_id', eventId)
      .order('computed_at', { ascending: false, nullsFirst: false })
      .limit(1) as unknown as PromiseLike<PgResult>
  let result = await read('projected_tickets, projected_total')
  if (isMissingColumns(result.error)) result = await read('projected_tickets')
  if (result.error) {
    console.error('Could not read the model total', result.error.message)
    return null
  }
  const row = ((result.data ?? []) as { projected_tickets?: number | string | null; projected_total?: number | string | null }[])[0]
  const value = toNum(row?.projected_total ?? row?.projected_tickets ?? null)
  return value == null || !Number.isFinite(value) ? null : Math.round(value)
}

async function runTiers(
  run: (tier: ColumnTier) => PromiseLike<PgResult>,
  tiers: ColumnTier[] = COLUMN_TIERS,
): Promise<PgResult> {
  let result: PgResult = { data: null, error: null }
  for (const tier of tiers) {
    result = await run(tier)
    if (!isMissingColumns(result.error)) return result
  }
  return result
}

function omitKeys(row: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)))
}

function todayInLosAngeles() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
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
    venueFee: toNum(row.venue_fee),
    merch: row.merch === true,
    eventPlanner: row.event_planner === true,
    merchandised: row.merchandised === true,
    revenueType: row.revenue_type ?? 'Ticketed',
    flatFee: toNum(row.flat_fee),
    portalEventId: row.portal_event_id ?? '',
    notes: row.notes ?? '',
    adjustedTotal: toNum(row.adjusted_total ?? null),
    adjustmentReason: row.adjustment_reason ?? null,
    adjustmentNote: row.adjustment_note ?? '',
    modelTotalAtAdjustment: toNum(row.model_total_at_adjustment ?? null),
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? '',
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

  const [showsRes, targetRes, otherRevenue] = await Promise.all([
    runTiers((tier) =>
      supabase
        .from('shows')
        .select(tier.columns)
        .gte('show_date', start)
        .lt('show_date', end)
        .order('show_date')
        .order('created_at'),
    ),
    supabase.from('monthly_targets').select('target').eq('month', start).maybeSingle(),
    readOtherRevenue(ym),
  ])
  if (showsRes.error) throw new Error(showsRes.error.message)
  if (targetRes.error) throw new Error(targetRes.error.message)

  const shows = ((showsRes.data ?? []) as ShowRow[]).map(fromRow)
  const eventIds = [...new Set(shows.map((s) => s.portalEventId.trim()).filter(Boolean))]
  const [portal, portalSyncedAt] = await Promise.all([readPortalMatches(eventIds), readLatestPortalSync()])

  return {
    shows,
    target: targetRes.data ? Number(targetRes.data.target) : null,
    otherRevenue,
    portal,
    portalSyncedAt,
  }
}

// planning_stats is read-only here. Returns dollars, or null when the row is missing or unreadable
// so the client falls back to the config default.
export async function getTypicalDiscoveryRevenue(): Promise<number | null> {
  await requireAccess()
  const { data, error } = await getSupabaseAdmin()
    .from('planning_stats')
    .select('value')
    .eq('key', 'typical_discovery_revenue')
    .maybeSingle()
  if (error) {
    console.error('Could not read planning_stats:', error.message)
    return null
  }
  return toNum((data as { value: number | string | null } | null)?.value ?? null)
}

type OtherRevenueRow = { id: string; month: string; label: string; amount: number | string }

const fromOtherRevenueRow = (row: OtherRevenueRow): OtherRevenueLine => ({
  id: row.id,
  month: row.month.slice(0, 7),
  label: row.label,
  amount: Number(row.amount),
})

// Reads degrade to an empty list until scripts/003 has created the table.
async function readOtherRevenue(ym: string): Promise<OtherRevenueLine[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('monthly_other_revenue')
    .select('id, month, label, amount')
    .eq('month', `${ym}-01`)
    .order('label')
  if (error) {
    console.error('Could not read monthly_other_revenue:', error.message)
    return []
  }
  return ((data ?? []) as OtherRevenueRow[]).map(fromOtherRevenueRow)
}

export async function saveOtherRevenue(raw: unknown): Promise<OtherRevenueLine> {
  await requireAccess()
  const input = validateOtherRevenueInput(raw)
  const row = { month: `${input.month}-01`, label: input.label, amount: input.amount }
  const supabase = getSupabaseAdmin()
  const query = input.id
    ? supabase.from('monthly_other_revenue').update(row).eq('id', input.id)
    : supabase.from('monthly_other_revenue').insert(row)
  const { data, error } = await query.select('id, month, label, amount').single()
  if (error) throw writeError(error)
  return fromOtherRevenueRow(data as OtherRevenueRow)
}

export async function deleteOtherRevenue(id: unknown): Promise<void> {
  await requireAccess()
  if (!isUuid(id)) throw new Error('Invalid id')
  const { error } = await getSupabaseAdmin().from('monthly_other_revenue').delete().eq('id', id)
  if (error) throw writeError(error)
}

export async function copyOtherRevenueToNextMonth(ym: string): Promise<{ copied: number; skipped: number }> {
  await requireAccess()
  assertMonth(ym)
  const { start, end } = monthBounds(ym)
  const supabase = getSupabaseAdmin()

  const [fromRes, toRes] = await Promise.all([
    supabase.from('monthly_other_revenue').select('label, amount').eq('month', start),
    supabase.from('monthly_other_revenue').select('label').eq('month', end),
  ])
  if (fromRes.error) throw writeError(fromRes.error)
  if (toRes.error) throw writeError(toRes.error)

  const existing = new Set(((toRes.data ?? []) as { label: string }[]).map((r) => r.label.trim().toLowerCase()))
  const rows = ((fromRes.data ?? []) as { label: string; amount: number | string }[])
    .filter((r) => !existing.has(r.label.trim().toLowerCase()))
    .map((r) => ({ month: end, label: r.label, amount: Number(r.amount) }))

  if (rows.length > 0) {
    const { error } = await supabase.from('monthly_other_revenue').insert(rows)
    if (error) throw writeError(error)
  }
  return { copied: rows.length, skipped: (fromRes.data?.length ?? 0) - rows.length }
}

type MarkerRow = { id: string; date: string; label: string; type: DayMarker['type']; note: string | null }

const fromMarkerRow = (row: MarkerRow): DayMarker => ({
  id: row.id,
  date: row.date,
  label: row.label,
  type: row.type,
  note: row.note ?? '',
})

export async function getDayMarkers(ym: string): Promise<DayMarker[]> {
  await requireAccess()
  assertMonth(ym)
  const { start, end } = monthBounds(ym)
  const { data, error } = await getSupabaseAdmin()
    .from('day_markers')
    .select('id, date, label, type, note')
    .gte('date', start)
    .lt('date', end)
    .order('date')
  if (error) {
    console.error('Could not read day_markers:', error.message)
    return []
  }
  return ((data ?? []) as MarkerRow[]).map(fromMarkerRow)
}

export async function saveDayMarker(raw: unknown): Promise<DayMarker> {
  await requireAccess()
  const input = validateMarkerInput(raw)
  const row = { date: input.date, label: input.label, type: input.type, note: input.note || null }
  const supabase = getSupabaseAdmin()
  const query = input.id
    ? supabase.from('day_markers').update(row).eq('id', input.id)
    : supabase.from('day_markers').insert(row)
  const { data, error } = await query.select('id, date, label, type, note').single()
  if (error) throw writeError(error)
  return fromMarkerRow(data as MarkerRow)
}

export async function deleteDayMarker(id: unknown): Promise<void> {
  await requireAccess()
  if (!isUuid(id)) throw new Error('Invalid id')
  const { error } = await getSupabaseAdmin().from('day_markers').delete().eq('id', id)
  if (error) throw writeError(error)
}

type SendRow = {
  id: string
  send_date: string
  name: string
  channel: Send['channel']
  segment: string | null
  assigned_to: string | null
  status: Send['status']
  notes: string | null
  featured_show_ids: string[] | null
}

const SEND_COLUMNS = 'id, send_date, name, channel, segment, assigned_to, status, notes, featured_show_ids'

const fromSendRow = (row: SendRow): Send => ({
  id: row.id,
  date: row.send_date,
  name: row.name,
  channel: row.channel,
  segment: row.segment ?? '',
  assignedTo: row.assigned_to ?? '',
  status: row.status,
  notes: row.notes ?? '',
  featuredShowIds: row.featured_show_ids ?? [],
})

function sendWriteError(error: PgError) {
  if (error.code === '42P01' || error.code === 'PGRST205') return new Error(SENDS_HINT)
  return new Error(error.message)
}

// Reads degrade to an empty list until scripts/006 has created the table.
export async function getSends(): Promise<Send[]> {
  await requireAccess()
  const { data, error } = await getSupabaseAdmin()
    .from('marketing_sends')
    .select(SEND_COLUMNS)
    .order('send_date')
    .order('created_at')
    .limit(3000)
  if (error) {
    console.error('Could not read marketing_sends:', error.message)
    return []
  }
  return ((data ?? []) as unknown as SendRow[]).map(fromSendRow)
}

export async function saveSend(raw: unknown): Promise<Send> {
  await requireAccess()
  const input = validateSendInput(raw)
  const row = {
    send_date: input.date,
    name: input.name,
    channel: input.channel,
    segment: input.segment || null,
    assigned_to: input.assignedTo || null,
    status: input.status,
    notes: input.notes || null,
    featured_show_ids: input.featuredShowIds,
  }
  const supabase = getSupabaseAdmin()
  const query = input.id
    ? supabase
        .from('marketing_sends')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', input.id)
    : supabase.from('marketing_sends').insert(row)
  const { data, error } = await query.select(SEND_COLUMNS).single()
  if (error) throw sendWriteError(error)
  return fromSendRow(data as unknown as SendRow)
}

export async function deleteSend(id: unknown): Promise<void> {
  await requireAccess()
  if (!isUuid(id)) throw new Error('Invalid id')
  const { error } = await getSupabaseAdmin().from('marketing_sends').delete().eq('id', id)
  if (error) throw sendWriteError(error)
}

// Shows (with their portal numbers) between two dates, inclusive. Read-only.
export async function getShowsRange(start: unknown, end: unknown): Promise<{ shows: Show[]; portal: PortalMap }> {
  await requireAccess()
  if (
    typeof start !== 'string' ||
    typeof end !== 'string' ||
    !DATE_RE.test(start) ||
    !DATE_RE.test(end) ||
    end < start
  ) {
    throw new Error('Invalid date range')
  }
  if ((Date.parse(end) - Date.parse(start)) / 86_400_000 > 120) throw new Error('That date range is too long')

  const supabase = getSupabaseAdmin()
  const res = await runTiers((tier) =>
    supabase
      .from('shows')
      .select(tier.columns)
      .gte('show_date', start)
      .lte('show_date', end)
      .order('show_date')
      .order('created_at'),
  )
  if (res.error) throw new Error(res.error.message)

  const shows = ((res.data ?? []) as ShowRow[]).map(fromRow)
  const eventIds = [...new Set(shows.map((s) => s.portalEventId.trim()).filter(Boolean))]
  return { shows, portal: await readPortalMatches(eventIds) }
}

type PortalEventRow = {
  event_id: string
  tickets_available: number | string | null
  confirmed: number | string | null
  comp_tickets?: number | string | null
  total_tickets?: number | string | null
  vips: number | string | null
  ticket_prices?: string | null
  ticket_mix?: string | null
  revenue_cents: number | string | null
  synced_at: string | null
}

type ProjectionRow = {
  event_id: string
  projected_tickets: number | string | null
  low: number | string | null
  high: number | string | null
  projected_total?: number | string | null
  total_low?: number | string | null
  total_high?: number | string | null
  projected_revenue_cents: number | string | null
  revenue_low_cents: number | string | null
  revenue_high_cents: number | string | null
  confidence: string | null
  confidence_tier: string | null
  sellout_likely: boolean | null
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

  // The total-ticket columns are read first; if they are not in the database yet, retry without
  // them so everything falls back to the paid columns.
  const readEvents = (columns: string) =>
    supabase
      .from('portal_events')
      .select(columns)
      .in('event_id', eventIds)
      .order('synced_at', { ascending: false, nullsFirst: false }) as PromiseLike<PgResult>
  const readProjections = (columns: string) =>
    supabase
      .from('projections')
      .select(columns)
      .in('event_id', eventIds)
      .order('computed_at', { ascending: false, nullsFirst: false }) as PromiseLike<PgResult>

  const EVENT_BASE = 'event_id, tickets_available, confirmed, vips, revenue_cents, synced_at'
  const PROJECTION_BASE =
    'event_id, projected_tickets, low, high, projected_revenue_cents, revenue_low_cents, revenue_high_cents, confidence, confidence_tier, sellout_likely, pace_label, computed_at'

  const [eventsRes, projectionsRes] = await Promise.all([
    readEvents(`${EVENT_BASE}, comp_tickets, total_tickets, ticket_prices, ticket_mix`)
      .then((res) =>
        isMissingColumns(res.error) ? readEvents(`${EVENT_BASE}, comp_tickets, total_tickets`) : res,
      )
      .then((res) => (isMissingColumns(res.error) ? readEvents(EVENT_BASE) : res)),
    readProjections(`${PROJECTION_BASE}, projected_total, total_low, total_high`).then((res) =>
      isMissingColumns(res.error) ? readProjections(PROJECTION_BASE) : res,
    ),
  ])

  const entry = (id: string): PortalMatch =>
    (portal[id] ??= {
      eventId: id,
      hasEvent: false,
      confirmed: null,
      compTickets: null,
      totalTickets: null,
      vips: null,
      ticketPrices: null,
      ticketMix: null,
      ticketsAvailable: null,
      revenue: null,
      projection: null,
    })

  if (eventsRes.error) console.error('Could not read portal_events:', eventsRes.error.message)
  for (const row of (eventsRes.data ?? []) as PortalEventRow[]) {
    const match = entry(row.event_id)
    if (match.hasEvent) continue
    match.hasEvent = true
    match.confirmed = toNum(row.confirmed)
    match.compTickets = toNum(row.comp_tickets ?? null)
    match.totalTickets = toNum(row.total_tickets ?? null)
    match.vips = toNum(row.vips)
    match.ticketPrices = row.ticket_prices?.trim() || null
    match.ticketMix = row.ticket_mix?.trim() || null
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
      totalTickets: toNum(row.projected_total ?? null),
      totalLow: toNum(row.total_low ?? null),
      totalHigh: toNum(row.total_high ?? null),
      revenue: centsToDollars(row.projected_revenue_cents),
      revenueLow: centsToDollars(row.revenue_low_cents),
      revenueHigh: centsToDollars(row.revenue_high_cents),
      confidence: resolveConfidence(row.confidence_tier, row.confidence),
      selloutLikely: row.sellout_likely === true,
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
  revenue_cents: number | string | null
  region: string | null
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
    .select('event_id, show_date, venue, tickets_available, organized_as, revenue_cents, region')
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

  const today = todayInLosAngeles()
  const candidates: ImportCandidate[] = []
  for (const event of events) {
    if (linkedIds.has(event.event_id)) continue
    // Each existing show can be offered to only one event.
    const match = unlinkedByDate.get(event.show_date)?.shift()
    let cents = projectedCents.get(event.event_id)
    // A past event with no projection takes its actual revenue as the projected revenue.
    if (cents == null && event.show_date < today && event.revenue_cents != null) {
      cents = Number(event.revenue_cents)
    }
    candidates.push({
      eventId: event.event_id,
      date: event.show_date,
      venue: event.venue ?? '',
      ticketsAvailable: toNum(event.tickets_available),
      projectedRevenue: cents == null ? null : cents / 100,
      organizedBy: /producer/i.test(event.organized_as ?? '') ? 'Local Producer' : 'Sofar',
      region: event.region === 'Long Beach' || event.region === 'Orange County' ? event.region : 'LA',
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
      region: c.region,
      organized_by: c.organizedBy,
      portal_event_id: c.eventId,
      notes: 'Imported from portal. Check format and price.',
    }))
    const { error } = await runTiers((tier) =>
      supabase.from('shows').insert(rows.map((row) => omitKeys(row, tier.omit))),
    )
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

export async function saveShow(raw: unknown): Promise<SaveShowResult> {
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
    venue_fee: input.venueFee,
    merch: input.merch,
    event_planner: input.eventPlanner,
    merchandised: input.merchandised,
    revenue_type: input.revenueType,
    flat_fee: input.flatFee,
    portal_event_id: input.portalEventId || null,
    notes: input.notes || null,
    adjusted_total: input.adjustedTotal,
    adjustment_reason: input.adjustmentReason,
    adjustment_note: input.adjustmentNote || null,
    model_total_at_adjustment: null as number | null,
    updated_by: input.updatedBy || null,
  }
  const supabase = getSupabaseAdmin()

  // Stamp the model's projected total at the moment the estimate is set or changed. Saving other
  // edits to the same estimate keeps the original stamp.
  if (input.adjustedTotal != null) {
    if (input.id) {
      const previous = await supabase
        .from('shows')
        .select('adjusted_total, model_total_at_adjustment')
        .eq('id', input.id)
        .maybeSingle()
      const prev = previous.data as { adjusted_total: number | null; model_total_at_adjustment: number | null } | null
      if (!previous.error && prev && prev.adjusted_total === input.adjustedTotal && prev.model_total_at_adjustment != null) {
        row.model_total_at_adjustment = Number(prev.model_total_at_adjustment)
      }
    }
    if (row.model_total_at_adjustment == null) row.model_total_at_adjustment = await readModelTotal(input.portalEventId)
  }

  // The update only matches while updated_at is still what the form was opened with, so a newer
  // edit by someone else is never overwritten unless the editor chose "Save anyway".
  const runSave = (payload: Record<string, unknown>, columns: string) => {
    if (!input.id) return supabase.from('shows').insert(payload).select(columns).single()
    let update = supabase
      .from('shows')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', input.id)
    if (!input.force && input.expectedUpdatedAt) update = update.eq('updated_at', input.expectedUpdatedAt)
    return update.select(columns).maybeSingle()
  }

  // Don't silently drop real revenue-field values if the migration hasn't run yet.
  const usesRevenueFields = input.revenueType === 'Flat fee' || input.merch || input.venueFee != null
  const usesEventPlanner = input.eventPlanner
  const usesAdjustment = input.adjustedTotal != null
  const usesMerchandised = input.merchandised
  const tiers = usesAdjustment
    ? COLUMN_TIERS.slice(0, 2)
    : usesMerchandised
      ? COLUMN_TIERS.slice(0, 3)
      : usesEventPlanner
        ? COLUMN_TIERS.slice(0, 4)
        : usesRevenueFields
          ? COLUMN_TIERS.slice(0, 5)
          : COLUMN_TIERS
  const { data, error } = await runTiers((tier) => runSave(omitKeys(row, tier.omit), tier.columns), tiers)
  if (error) {
    if (usesAdjustment && isMissingColumns(error)) throw new Error(ADJUSTMENT_HINT)
    if (usesMerchandised && isMissingColumns(error)) throw new Error(MERCHANDISED_HINT)
    if (usesEventPlanner && isMissingColumns(error)) throw new Error(EVENT_PLANNER_HINT)
    if (usesRevenueFields && isMissingColumns(error)) throw new Error(NEW_FIELDS_HINT)
    throw new Error(error.message)
  }
  if (!data) return { status: 'conflict' }
  return { status: 'saved', show: fromRow(data as unknown as ShowRow) }
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
