-- Adds the team's manual projection adjustment fields to shows.
-- Additive only: existing shows get null. No drops, deletes, or changes to other tables.
-- portal_events and projections are never touched.

alter table public.shows
  add column if not exists adjusted_total integer
    check (adjusted_total is null or adjusted_total >= 0),
  add column if not exists adjustment_reason text
    check (
      adjustment_reason is null
      or adjustment_reason in (
        'Competing event',
        'Holiday weekend',
        'Billed headliner',
        'Heavy promotion',
        'Artist draw',
        'Weather',
        'Other'
      )
    ),
  add column if not exists adjustment_note text,
  add column if not exists model_total_at_adjustment integer;
