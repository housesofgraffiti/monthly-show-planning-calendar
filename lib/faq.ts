export type FaqItem = { question: string; answer: string }

// Edit the questions and answers below. The FAQ panel picks them up automatically, in this order.
export const FAQ: FaqItem[] = [
  {
    question: 'What do "Behind" and "Ahead" mean?',
    answer:
      'In the last 3 days before a show, we compare its paid tickets sold so far to about 150 past LA shows at the same point. Behind means slower than most (bottom 25%). Ahead means faster than most (top 25%). No tag means on track. The projection already accounts for it, so the tag is just a heads-up.',
  },
  {
    question: "Why don't tags show up earlier than 3 days out?",
    answer:
      "Early sales don't predict much. Shows that look slow a week out usually recover, so we wait until the numbers are reliable.",
  },
  {
    question: 'What\'s the difference between "Locked in" and "Projected"?',
    answer:
      'Locked in is real money: past shows, tickets already sold for upcoming shows, flat fees and sponsorships. Projected adds what we expect upcoming shows to still sell. A ~ in front of a number always means projected.',
  },
  {
    question: 'How accurate are the projections?',
    answer:
      "Two weeks out they're a rough guide, about as good as a typical-show average. Inside 3 days they get much better. The range shown is where about 80% of shows end up.",
  },
  {
    question: 'What does "Low" or "High" confidence mean?',
    answer:
      "High means the show is within 3 days and at a venue with history. Low means it's further out, or it's a new venue, format or region. Low-confidence numbers have wider ranges.",
  },
  {
    question: 'Why is the range so wide on some shows?',
    answer:
      'Usually a new venue, a new region like Long Beach, or a producer-run show with little history. The range narrows as real sales come in.',
  },
  {
    question: 'Do the ticket numbers match the portal?',
    answer:
      'Yes. Confirmed counts paid tickets plus comps, the same as the portal. VIPs are listed separately. Revenue only counts paid tickets.',
  },
  {
    question: 'When should I use "Your estimate"?',
    answer:
      "When you know something the model doesn't: a competing event, a billed headliner, a big promo push, a new producer. Pick a reason chip and add a note. Your number replaces the model's in all totals, and we compare both against the final count later to see whose call was better.",
  },
  {
    question: "What's the difference between Idea, Tentative and On sale?",
    answer:
      'Idea is a possibility. Tentative is likely but not set. On sale means it\'s on the calendar with the event link live. In the Expected number, Tentative counts at 60% and Idea at 30%.',
  },
  {
    question: 'How do Local Producer shows work here?',
    answer:
      "Their revenue counts toward the target, but we don't track their sell-through or pace. You can still add your own estimate.",
  },
  {
    question: "What's a flat fee show?",
    answer:
      "A show where we're paid a set amount (like a college or brand partnership). Tickets don't matter for revenue; the flat fee counts as locked in.",
  },
  {
    question: 'What does "Decide by" mean?',
    answer:
      'The day before the next email or SMS that promotes the show. Make cancel or go decisions before then so we never promote a show we\'re about to cancel.',
  },
  {
    question: 'What does "Sellout likely" mean?',
    answer:
      "Inside 3 days, the projection is at least 90% of tickets available. Earlier than that, it means the show is already 60%+ sold and projects to sell out. When it appears, it's right about 80% of the time.",
  },
  {
    question: 'What does "Merchandised" mean?',
    answer:
      "The event page has been updated specifically for this show. Shows within 14 days that aren't merchandised get a small reminder on the card.",
  },
  {
    question: 'How often does the data update?',
    answer:
      'Portal numbers sync every hour. Edits from teammates show up right away. The model retrains every night with the latest finished shows.',
  },
  {
    question: 'Who do I ask if something looks wrong?',
    answer: 'Ben.',
  },
]
