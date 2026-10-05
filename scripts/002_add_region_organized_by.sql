-- Adds Region and Organized By to existing shows.
-- Safe to run on a table that already has data: only adds columns with defaults,
-- so every existing row is backfilled automatically. No drops or deletes.

alter table public.shows
  add column if not exists region text not null default 'LA'
    check (region in ('LA', 'Long Beach', 'Orange County'));

alter table public.shows
  add column if not exists organized_by text not null default 'Sofar'
    check (organized_by in ('Sofar', 'Local Producer'));
