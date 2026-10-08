import { addDays } from './dates'
import { activeAdjustment, modelTotal } from './adjustments'
import { confirmedTotal, paceTag, portalFor, projectedTotal, type PortalMap, type PortalMatch } from './portal'
import { DATE_RE, isUuid, type Show } from './shows'

export const SEND_CHANNELS = ['Email', 'SMS'] as const
export type SendChannel = (typeof SEND_CHANNELS)[number]

export const SEND_STATUSES = ['Planned', 'Scheduled', 'Sent'] as const
export type SendStatus = (typeof SEND_STATUSES)[number]

export type Send = {
  id: string
  date: string
  name: string
  channel: SendChannel
  segment: string
  assignedTo: string
  status: SendStatus
  notes: string
  featuredShowIds: string[]
}

export type SendInput = Omit<Send, 'id'> & { id?: string }

// A send can push shows that happen this many days after it.
export const PUSH_WINDOW = { min: 2, max: 21 } as const

const cleanText = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

export function validateSendInput(raw: unknown): SendInput {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid send')
  const r = raw as Record<string, unknown>

  const date = typeof r.date === 'string' && DATE_RE.test(r.date) ? r.date : null
  if (!date || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) throw new Error('A valid date is required')

  const name = cleanText(r.name, 160)
  if (!name) throw new Error('Add a name for this send')

  const channel = r.channel as SendChannel
  if (!SEND_CHANNELS.includes(channel)) throw new Error('Pick Email or SMS')

  const status = r.status as SendStatus
  if (!SEND_STATUSES.includes(status)) throw new Error('Pick a status')

  if (r.id !== undefined && !isUuid(r.id)) throw new Error('Invalid id')

  const ids = r.featuredShowIds === undefined ? [] : r.featuredShowIds
  if (!Array.isArray(ids) || ids.length > 200 || !ids.every(isUuid)) throw new Error('Invalid featured shows')

  return {
    id: r.id as string | undefined,
    date,
    name,
    channel,
    segment: cleanText(r.segment, 120),
    assignedTo: cleanText(r.assignedTo, 120),
    status,
    notes: cleanText(r.notes, 4000),
    featuredShowIds: [...new Set(ids as string[])],
  }
}

export const sortSends = (sends: Send[]) =>
  [...sends].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))

export function sendsByDate(sends: Send[]): Map<string, Send[]> {
  const map = new Map<string, Send[]>()
  for (const send of sends) map.set(send.date, [...(map.get(send.date) ?? []), send])
  return map
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

// "Tue Oct 13"
export function formatDayShort(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`)
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${weekday} ${month} ${d.getUTCDate()}`
}

export type DecideBy = {
  date: string
  sendId: string
  sendName: string
  // True when a send features this show, false when it is only the next email that could.
  featured: boolean
}

// The day before the first send (today onward, before the show) that features the show. When no
// send features it, the day before the next Email send that could still push it, which is one
// that goes out 2 to 21 days ahead of the show. `sends` must be sorted by date, oldest first.
export function decideByFor(show: Show, sends: Send[], todayISO: string): DecideBy | null {
  if (show.status === 'Cancelled' || show.date < todayISO) return null

  const upcoming = (send: Send) => send.date >= todayISO && send.date < show.date
  const featuring = sends.find((send) => upcoming(send) && send.featuredShowIds.includes(show.id))
  if (featuring) {
    return { date: addDays(featuring.date, -1), sendId: featuring.id, sendName: featuring.name, featured: true }
  }

  const nextEmail = sends.find((send) => {
    if (send.channel !== 'Email' || !upcoming(send)) return false
    const lead = daysBetween(send.date, show.date)
    return lead >= PUSH_WINDOW.min && lead <= PUSH_WINDOW.max
  })
  return nextEmail
    ? { date: addDays(nextEmail.date, -1), sendId: nextEmail.id, sendName: nextEmail.name, featured: false }
    : null
}

export const decideBySource = (decideBy: DecideBy) =>
  decideBy.featured ? `for ${decideBy.sendName}` : `next email: ${decideBy.sendName}`

export type Decision = { show: Show; decideBy: DecideBy }

export function decisionsThisWeek(shows: Show[], sends: Send[], todayISO: string): Decision[] {
  const end = addDays(todayISO, 7)
  const decisions: Decision[] = []
  for (const show of shows) {
    const decideBy = decideByFor(show, sends, todayISO)
    if (decideBy && decideBy.date >= todayISO && decideBy.date <= end) decisions.push({ show, decideBy })
  }
  return decisions.sort(
    (a, b) => a.decideBy.date.localeCompare(b.decideBy.date) || a.show.date.localeCompare(b.show.date),
  )
}

export function featuredInNames(show: Show, sends: Send[]): string[] {
  return sends.filter((send) => send.featuredShowIds.includes(show.id)).map((send) => send.name)
}

export type PushCandidate = {
  show: Show
  match: PortalMatch | undefined
  projected: number | null
  adjusted: boolean
  pace: 'Behind' | 'Ahead' | null
  seatsLeft: number | null
}

// Non-cancelled shows 2 to 21 days after the send. Already-featured shows come first, then
// Behind shows, then the most seats left. Likely sellouts are hidden (unless already featured)
// and counted so the panel can say so.
export function pushCandidates(
  shows: Show[],
  portal: PortalMap | undefined,
  sendDate: string,
  featuredIds: string[],
): { candidates: PushCandidate[]; hiddenSellouts: number } {
  const featured = new Set(featuredIds)
  const candidates: PushCandidate[] = []
  let hiddenSellouts = 0

  for (const show of shows) {
    if (show.status === 'Cancelled') continue
    const lead = daysBetween(sendDate, show.date)
    if (lead < PUSH_WINDOW.min || lead > PUSH_WINDOW.max) continue

    const match = portalFor(show, portal)
    if (match?.projection?.selloutLikely === true && !featured.has(show.id)) {
      hiddenSellouts++
      continue
    }

    const adjustedTotal = activeAdjustment(show, false)
    const model = match?.projection ? projectedTotal(match.projection) : modelTotal(match)
    const seatsLeft =
      match?.ticketsAvailable != null ? match.ticketsAvailable - (confirmedTotal(match) ?? 0) : null
    candidates.push({
      show,
      match,
      projected: adjustedTotal ?? model,
      adjusted: adjustedTotal != null,
      pace: paceTag(match?.projection?.paceLabel),
      seatsLeft,
    })
  }

  candidates.sort((a, b) => {
    const featuredDiff = Number(featured.has(b.show.id)) - Number(featured.has(a.show.id))
    if (featuredDiff) return featuredDiff
    const behindDiff = Number(b.pace === 'Behind') - Number(a.pace === 'Behind')
    if (behindDiff) return behindDiff
    const seatsDiff = (b.seatsLeft ?? -1) - (a.seatsLeft ?? -1)
    return seatsDiff || a.show.date.localeCompare(b.show.date)
  })

  return { candidates, hiddenSellouts }
}
