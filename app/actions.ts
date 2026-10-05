'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { ACCESS_COOKIE, accessTokenFor, hasTeamAccess, safeEqual } from '@/lib/team-access'
import { monthBounds } from '@/lib/dates'
import {
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

const SHOW_COLUMNS =
  'id, show_date, category, format, area, venue, tickets, ticket_price, projected_revenue, status, region, organized_by, portal_event_id, notes'

const toNum = (v: number | string | null) => (v == null ? null : Number(v))

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
    region: row.region,
    organizedBy: row.organized_by,
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

  const [showsRes, targetRes] = await Promise.all([
    supabase
      .from('shows')
      .select(SHOW_COLUMNS)
      .gte('show_date', start)
      .lt('show_date', end)
      .order('show_date')
      .order('created_at'),
    supabase.from('monthly_targets').select('target').eq('month', start).maybeSingle(),
  ])
  if (showsRes.error) throw new Error(showsRes.error.message)
  if (targetRes.error) throw new Error(targetRes.error.message)

  return {
    shows: (showsRes.data as ShowRow[]).map(fromRow),
    target: targetRes.data ? Number(targetRes.data.target) : null,
  }
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
  const query = input.id
    ? supabase.from('shows').update({ ...row, updated_at: new Date().toISOString() }).eq('id', input.id)
    : supabase.from('shows').insert(row)
  const { data, error } = await query.select(SHOW_COLUMNS).single()
  if (error) throw new Error(error.message)
  return fromRow(data as ShowRow)
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
