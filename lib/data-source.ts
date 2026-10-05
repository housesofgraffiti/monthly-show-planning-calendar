import { deleteShow, getMonthData, saveMonthlyTarget, saveShow } from '@/app/actions'
import { daysInMonth } from '@/lib/dates'
import type { Category, MonthData, Show, ShowInput, Status } from '@/lib/shows'

export type DataMode = 'remote' | 'local'

export type DataSource = {
  getMonth: (ym: string) => Promise<MonthData>
  saveShow: (input: ShowInput) => Promise<Show>
  deleteShow: (id: string) => Promise<void>
  saveTarget: (ym: string, target: number) => Promise<void>
}

export const remoteSource: DataSource = {
  getMonth: (ym) => getMonthData(ym),
  saveShow: (input) => saveShow(input),
  deleteShow: (id) => deleteShow(id),
  saveTarget: (ym, target) => saveMonthlyTarget(ym, target),
}

const STORAGE_KEY = 'sofar-show-calendar-preview-v1'

type LocalState = { shows: Show[]; targets: Record<string, number> }

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
      portalEventId: '',
      notes: '',
    })),
    targets: { [ym]: 42000 },
  }
}

function read(seedMonth: string): LocalState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as LocalState
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
      }
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
  }
}
