export type TourStep = {
  id: string
  selector: string
  text: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}

// Steps whose selector doesn't match anything visible on screen are skipped.
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'header',
    selector: '[data-tour="header"]',
    side: 'bottom',
    text: 'Welcome! This is our shared show calendar. Everyone sees the same data, and changes show up for the whole team right away.',
  },
  {
    id: 'month-nav',
    selector: '[data-tour="month-nav"]',
    side: 'bottom',
    text: 'Move between months here. Today jumps back to the current month.',
  },
  {
    id: 'view-toggle',
    selector: '[data-tour="view-toggle"]',
    side: 'bottom',
    text: 'Switch between the calendar and a spreadsheet-style table. The table has a Show all columns option for the full detail.',
  },
  {
    id: 'region-filter',
    selector: '[data-tour="region-filter"]',
    side: 'bottom',
    text: 'Filter to LA, Long Beach or Orange County. The target and totals always include every region.',
  },
  {
    id: 'import',
    selector: '[data-tour="import"]',
    side: 'bottom',
    text: "Pulls this month's published portal events onto the calendar. Check the format and price on anything new.",
  },
  {
    id: 'add-show',
    selector: '[data-tour="add-show"]',
    side: 'bottom',
    text: 'Add a show or idea by hand, or click any empty day.',
  },
  {
    id: 'progress',
    selector: '[data-tour="progress"]',
    side: 'bottom',
    text: "How close we are to the monthly target. Dark is money already in. Striped is what we expect to still sell. The note on the right says roughly how many more shows we'd need.",
  },
  {
    id: 'summary',
    selector: '[data-tour="summary"]',
    side: 'top',
    text: 'Locked in is real money: past shows, tickets already sold, flat fees and sponsorships. Projected total adds what we expect to sell.',
  },
  {
    id: 'mix',
    selector: '[data-tour="mix"]',
    side: 'bottom',
    text: 'How many shows of each type this month. Click one to highlight those shows.',
  },
  {
    id: 'decisions',
    selector: '[data-tour="decisions"]',
    side: 'bottom',
    text: 'Shows that need a go or no-go before their next email or SMS goes out.',
  },
  {
    id: 'show-card',
    selector: '[data-tour="show-card"]',
    side: 'right',
    text: 'Each card shows the venue, format, tickets sold → projected (29/50 → ~34), and money in vs. projected. A ~ means it\'s a projection, not money in hand.',
  },
  {
    id: 'pace-tag',
    selector: '[data-tour="pace-tag"]',
    side: 'right',
    text: 'Behind or Ahead compares paid sales to past shows at the same point. It only appears in the last 3 days, when the numbers are reliable.',
  },
  {
    id: 'open-night',
    selector: '[data-tour="open-night"]',
    side: 'right',
    text: 'Empty Friday, Saturday and Sunday nights are shaded so gaps stand out.',
  },
  {
    id: 'day-marker',
    selector: '[data-tour="day-marker"]',
    side: 'right',
    text: 'Holidays, big events and marketing sends show at the top of the day.',
  },
  {
    id: 'other-revenue',
    selector: '[data-tour="other-revenue"]',
    side: 'top',
    text: 'Sponsorships like Tinder go here. They count toward the target. Use Copy to next month for recurring ones.',
  },
  {
    id: 'sync-status',
    selector: '[data-tour="sync-status"]',
    side: 'top',
    text: 'Portal numbers update every hour. If this turns amber, the sync has stopped; let Ben know.',
  },
  {
    id: 'help',
    selector: '[data-tour="help"]',
    side: 'bottom',
    text: 'Replay this tour or open the FAQ any time from here.',
  },
]
