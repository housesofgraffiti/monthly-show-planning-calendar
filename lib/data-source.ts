import {
  copyOtherRevenueToNextMonth,
  deleteDayMarker,
  deleteOtherRevenue,
  deleteShow,
  getDayMarkers,
  getImportCandidates,
  getMonthData,
  getPortalSuggestions,
  getTypicalDiscoveryRevenue,
  importFromPortal,
  saveDayMarker,
  saveMonthlyTarget,
  saveOtherRevenue,
  saveShow,
} from '@/app/actions'
import { addMonths, daysInMonth } from '@/lib/dates'
import type { DayMarker, DayMarkerInput } from '@/lib/markers'
import type { ImportCandidate, ImportChoice, ImportResult, PortalSuggestion } from '@/lib/portal'
import type {
  Category,
  MonthData,
  OtherRevenueInput,
  OtherRevenueLine,
  Show,
  ShowInput,
  Status,
} from '@/lib/shows'

export type DataMode = 'remote' | 'local'

export type DataSource = {
  getMonth: (ym: string) => Promise<MonthData>
  getTypicalDiscoveryRevenue: () => Promise<number | null>
  saveShow: (input: ShowInput) => Promise<Show>
  deleteShow: (id: string) => Promise<void>
  saveTarget: (ym: string, target: number) => Promise<void>
  getPortalSuggestions: (date: string) => Promise<PortalSuggestion[]>
  getImportCandidates: (ym: string) => Promise<ImportCandidate[]>
  importFromPortal: (ym: string, choices: ImportChoice[]) => Promise<ImportResult>
  saveOtherRevenue: (input: OtherRevenueInput) => Promise<OtherRevenueLine>
  deleteOtherRevenue: (id: string) => Promise<void>
  copyOtherRevenue: (ym: string) => Promise<{ copied: number; skipped: number }>
  getMarkers: (ym: string) => Promise<DayMarker[]>
  saveMarker: (input: DayMarkerInput) => Promise<DayMarker>
  deleteMarker: (id: string) => Promise<void>
}

export const remoteSource: DataSource = {
  saveOtherRevenue: (input) => saveOtherRevenue(input),
  deleteOtherRevenue: (id) => deleteOtherRevenue(id),
  copyOtherRevenue: (ym) => copyOtherRevenueToNextMonth(ym),
  getMarkers: (ym) => getDayMarkers(ym),
  saveMarker: (input) => saveDayMarker(input),
  deleteMarker: (id) => deleteDayMarker(id),
  getMonth: (ym) => getMonthData(ym),
  getTypicalDiscoveryRevenue: () => getTypicalDiscoveryRevenue(),
  getPortalSuggestions: (date) => getPortalSuggestions(date),
  getImportCandidates: (ym) => getImportCandidates(ym),
  importFromPortal: (ym, choices) => importFromPortal(ym, choices),
  saveShow: (input) => saveShow(input),
  deleteShow: (id) => deleteShow(id),
  saveTarget: (ym, target) => saveMonthlyTarget(ym, target),
}

const STORAGE_KEY = 'sofar-show-calendar-preview-v1'

type LocalState = {
  shows: Show[]
  targets: Record<string, number>
  otherRevenue: OtherRevenueLine[]
  markers: DayMarker[]
}

type Seed = [number, Category, string, string, string, number | null, number | null, number | null, Status]

const SEED: Seed[] = [
  [2, 'Core', 'Discovery', 'Echo Park', 'The Lodge Room', 80, 27.5, 2200, 'Confirmed'],
  [3, 'Premium', 'Candlelight Session', 'Downtown', 'St. Vincent Court', 120, 55, 6600, 'Confirmed'],
  [3, 'Core', 'Discovery: Rooftop', 'Hollywood', 'Mama Shelter', 80, 27.5, 2200, 'Tentative'],
  [7, 'Special', 'Sofar Festival / Kickoff', 'Venice', 'Abbot Kinney Loft', null, null, null, 'Confirmed'],
  [9, 'Core', 'Discovery: Jazz Night', 'Leimert Park', 'Sankofa Hall', 60, 30, 1800, 'Tentative'],
  [10, 'Premium', 'Sunset Boat Show', 'Marina del Rey', 'Hornblower Dock', 88, 45, 3960, 'Confirmed'],
  [10, 'Core', 'Discovery: Backyard', 'Silver Lake', 'Private home', 50, 25, 1250, 'Cancelled'],
  [14, 'Special', 'Brand Partnership', 'Culver City', 'Platform', null, null, 6000, 'Idea'],
  [16, 'Core', 'Discovery: Hip Hop R&B', 'Inglewood', 'Hilltop Coffee', 85, 27, 2295, 'Confirmed'],
  [17, 'Premium', 'Pottery Session', 'Highland Park', 'Clay Studio', 24, 100, 2400, 'Confirmed'],
  [17, 'Core', 'Discovery', 'Santa Monica', 'Annenberg House', 100, 27, 2700, 'Confirmed'],
  [21, 'Core', 'Artist Headline', 'Hollywood', 'The Fonda', 240, 30, 7200, 'Tentative'],
  [23, 'Premium', 'Sound Bath', 'Topanga', 'Canyon Barn', 50, 46, 2300, 'Idea'],
  [24, 'Core', 'Discovery: Storytellers', 'Los Feliz', 'Skylight Books', 60, 28, 1680, 'Confirmed'],
  [24, 'Special', 'College / Campus', 'Westwood', 'UCLA Royce Patio', null, null, 3000, 'Tentative'],
  [28, 'Core', 'Singles Night', 'Arts District', 'Resident', 90, 30, 2700, 'Tentative'],
  [30, 'Premium', 'Candlelight Session', 'Pasadena', 'All Saints Church', 110, 55, 6050, 'Idea'],
]

function seedState(ym: string): LocalState {
  const lastDay = daysInMonth(ym)
  return {
    shows: SEED.map(([day, category, format, area, venue, tickets, ticketPrice, projectedRevenue, status]) => ({
      id: crypto.randomUUID(),
      date: `${ym}-${String(Math.min(day, lastDay)).padStart(2, '0')}`,
      category,
      format,
      area,
      venue,
      tickets,
      ticketPrice,
      projectedRevenue,
      status,
      region: 'LA',
      organizedBy: 'Sofar',
      venueFee: null,
      merch: false,
      revenueType: 'Ticketed',
      flatFee: null,
      portalEventId: '',
      notes: '',
    })),
    targets: { [ym]: 42000 },
    otherRevenue: [],
    markers: [],
  }
}

function read(seedMonth: string): LocalState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<LocalState> & { shows: Show[]; targets: Record<string, number> }
      return {
        ...parsed,
        shows: parsed.shows.map((s) => ({
          ...s,
          venueFee: s.venueFee ?? null,
          merch: s.merch ?? false,
          revenueType: s.revenueType ?? 'Ticketed',
          flatFee: s.flatFee ?? null,
        })),
        otherRevenue: parsed.otherRevenue ?? [],
        markers: parsed.markers ?? [],
      }
    } catch {
      // fall through and reseed corrupted preview data
    }
  }
  const state = seedState(seedMonth)
  write(state)
  return state
}

function write(state: LocalState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetLocalData() {
  localStorage.removeItem(STORAGE_KEY)
}

export function createLocalSource(seedMonth: string): DataSource {
  return {
    async getMonth(ym) {
      const state = read(seedMonth)
      return {
        shows: state.shows.filter((s) => s.date.startsWith(ym)).sort((a, b) => a.date.localeCompare(b.date)),
        target: state.targets[ym] ?? null,
        otherRevenue: state.otherRevenue.filter((l) => l.month === ym).sort((a, b) => a.label.localeCompare(b.label)),
      }
    },
    async getTypicalDiscoveryRevenue() {
      return null
    },
    async saveOtherRevenue(input) {
      const state = read(seedMonth)
      const line: OtherRevenueLine = { ...input, id: input.id ?? crypto.randomUUID() }
      const index = state.otherRevenue.findIndex((l) => l.id === line.id)
      if (index >= 0) state.otherRevenue[index] = line
      else state.otherRevenue.push(line)
      write(state)
      return line
    },
    async deleteOtherRevenue(id) {
      const state = read(seedMonth)
      state.otherRevenue = state.otherRevenue.filter((l) => l.id !== id)
      write(state)
    },
    async copyOtherRevenue(ym) {
      const state = read(seedMonth)
      const next = addMonths(ym, 1)
      const existing = new Set(state.otherRevenue.filter((l) => l.month === next).map((l) => l.label.trim().toLowerCase()))
      const source = state.otherRevenue.filter((l) => l.month === ym)
      const fresh = source.filter((l) => !existing.has(l.label.trim().toLowerCase()))
      state.otherRevenue.push(...fresh.map((l) => ({ ...l, id: crypto.randomUUID(), month: next })))
      write(state)
      return { copied: fresh.length, skipped: source.length - fresh.length }
    },
    async getMarkers(ym) {
      return read(seedMonth).markers.filter((m) => m.date.startsWith(ym))
    },
    async saveMarker(input) {
      const state = read(seedMonth)
      const marker: DayMarker = { ...input, id: input.id ?? crypto.randomUUID() }
      const index = state.markers.findIndex((m) => m.id === marker.id)
      if (index >= 0) state.markers[index] = marker
      else state.markers.push(marker)
      write(state)
      return marker
    },
    async deleteMarker(id) {
      const state = read(seedMonth)
      state.markers = state.markers.filter((m) => m.id !== id)
      write(state)
    },
    async saveShow(input) {
      const state = read(seedMonth)
      const show: Show = { ...input, id: input.id ?? crypto.randomUUID() }
      const index = state.shows.findIndex((s) => s.id === show.id)
      if (index >= 0) state.shows[index] = show
      else state.shows.push(show)
      write(state)
      return show
    },
    async deleteShow(id) {
      const state = read(seedMonth)
      state.shows = state.shows.filter((s) => s.id !== id)
      write(state)
    },
    async saveTarget(ym, target) {
      const state = read(seedMonth)
      state.targets[ym] = target
      write(state)
    },
    async getPortalSuggestions() {
      return []
    },
    async getImportCandidates() {
      return []
    },
    async importFromPortal() {
      return { created: 0, linked: 0, skipped: 0 }
    },
  }
}
