// One-line plain-language explanations, reused by the Key, card tooltips and the "i" icons in the show form.
export const TAG_HELP = {
  'Sold out': 'Tickets sold have reached the available capacity.',
  'Sellout likely': 'Sales are on pace to fill nearly every ticket.',
  Behind: 'Selling slower than most past shows at this point.',
  Ahead: 'Selling faster than most past shows at this point.',
  LP: 'Run by a local producer. We don\u2019t track its sales pace.',
} as const

export const SYMBOL_HELP = {
  estimate: 'An estimate, not money in hand.',
  alreadyIn: 'Money already in: tickets sold so far.',
  expected: 'What we expect this show to bring in. An estimate, not money in hand.',
  plan: 'The planned amount. An estimate, not money in hand.',
  flatFee: 'A set amount we are paid for this show, whatever the ticket sales.',
  adjusted: 'Adjusted by someone on the team using Your estimate.',
  tickets: 'Tickets sold so far, then how many we expect to sell in total.',
  merch: 'There is a merch table at this show.',
  eventPlanner: 'An event planner is working this show.',
  notMerchandised: 'The event page has not been updated for this show yet.',
  Idea: 'Idea: just a thought.',
  Tentative: 'Tentative: likely, but not locked in.',
} as const

export const FIELD_HELP = {
  category: 'Core, Premium or Special. The color on the calendar shows the category.',
  status: 'Idea is just a thought. Tentative is likely but not locked. On sale means the event page is live.',
  organizedBy:
    'Local Producer shows are run by a local producer (tagged LP). Their revenue counts toward the goal, but we don\u2019t track their sales pace.',
  revenueType:
    'Ticketed shows earn from ticket sales. A flat fee show is paid a set amount (like a college or brand partnership), so tickets don\u2019t matter.',
  venueFee: 'The fee for using the venue, if there is one.',
  expectedRevenue: 'What we expect from tickets: tickets times price. Type your own number to override it.',
  merchandised: 'The event page has been updated specifically for this show. Upcoming shows that aren\u2019t merchandised get a small reminder on the card.',
  portalId: 'The show\u2019s ID on the Sofar portal. It links this show to live ticket sales.',
  estimate:
    'Use it when you know something the numbers don\u2019t, like a competing event or a billed headliner. Your number replaces ours in all totals.',
  decideBy: 'The day before the next email or text that promotes this show.',
  featuredIn: 'The planned emails or texts that promote this show.',
} as const
