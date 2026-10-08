-- Adds the "Event planner" flag to shows.
-- Additive only: existing shows get false. No drops or deletes.

alter table public.shows
  add column if not exists event_planner boolean not null default false;
