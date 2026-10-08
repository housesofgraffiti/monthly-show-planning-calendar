export function VenuesPlaceholder() {
  return (
    <section
      aria-label="Venues"
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 px-6 py-20 text-center"
    >
      <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Venue list, coming soon</h2>
      <p className="max-w-xl text-pretty text-sm leading-relaxed text-neutral-600">
        A list of our venues with capacity, area, bar or BYOB, availability, fees and what formats each one suits.
        Picking a venue when adding a show will fill these in automatically.
      </p>
      <p className="text-sm text-neutral-400">Have updates for the venue list? Send them to Ben.</p>
    </section>
  )
}
