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
    text: 'Month at a glance: how much we expect to make against our goal. Dark is money already in. Striped is what we still expect from ticket sales. Click the pencil to change the goal.',
  },
  {
    id: 'summary',
    selector: '[data-tour="summary"]',
    side: 'top',
    text: 'Already in is real money: finished shows, tickets sold, flat fees and sponsorships. Still expected is our estimate of ticket sales to come. Click More numbers for the details.',
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
    text: 'Empty Friday, Saturday and Sunday nights are shaded blue so gaps stand out.',
  },
  {
    id: 'show-menu',
    selector: '[data-tour="show-menu"]',
    side: 'bottom',
    text: 'Turn holidays and marketing sends on or off here.',
  },
  {
    id: 'send-chip',
    selector: '[data-tour="send-chip"]',
    side: 'right',
    text: 'This is a planned email or SMS. Click it to see which shows it features and to pick shows that need a push.',
  },
  {
    id: 'key',
    selector: '[data-tour="key"]',
    side: 'bottom',
    text: 'Not sure what a color or tag means? Open the key.',
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
    text: 'Ticket numbers update every hour. Press Sync now to refresh them. If this turns amber, the sync has stopped; let Ben know.',
  },
  {
    id: 'help',
    selector: '[data-tour="help"]',
    side: 'bottom',
    text: 'Replay this tour, take the tour of a show, or open the FAQ any time from here.',
  },
]

export const SHOW_FORM_STEPS: TourStep[] = [
  {
    id: 'form-basics',
    selector: '[data-tour="form-basics"]',
    side: 'right',
    text: "The basics: when it is, what kind of show, and whether it's an idea, likely, or on sale.",
  },
  {
    id: 'form-where',
    selector: '[data-tour="form-where"]',
    side: 'right',
    text: 'Where: the venue and neighborhood.',
  },
  {
    id: 'form-money',
    selector: '[data-tour="form-money"]',
    side: 'right',
    text: 'Money: how this show makes money. Ticketed shows use tickets and price; flat fee shows use the agreed amount.',
  },
  {
    id: 'form-checklist',
    selector: '[data-tour="form-checklist"]',
    side: 'right',
    text: 'Checklist: tick these off as you prep. Merchandised means the event page is updated for this show.',
  },
  {
    id: 'form-portal',
    selector: '[data-tour="form-portal"]',
    side: 'right',
    text: 'From the portal: live ticket sales and what we expect the show to sell. Updates every hour.',
  },
  {
    id: 'form-estimate',
    selector: '[data-tour="form-estimate"]',
    side: 'right',
    text: "Your estimate: if you know something the numbers don't, enter your own guess here. Pick a reason so we can learn from it.",
  },
  {
    id: 'form-marketing',
    selector: '[data-tour="form-marketing"]',
    side: 'right',
    text: 'Marketing: the date to make a go or no-go call, and which emails or texts feature this show.',
  },
  {
    id: 'form-notes',
    selector: '[data-tour="form-notes"]',
    side: 'right',
    text: 'Notes: anything the team should know. Then hit Save.',
  },
]
