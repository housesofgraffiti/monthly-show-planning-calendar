-- Adds venue fee, merch, and revenue type to shows, plus tables for
-- monthly other revenue (sponsorships) and day markers.
-- Safe to run on a table that already has data: it only adds columns with
-- defaults (existing shows become 'Ticketed', no merch, no venue fee) and
-- creates new tables. No drops or deletes.

alter table public.shows
  add column if not exists venue_fee numeric(12, 2)
    check (venue_fee is null or venue_fee >= 0);

alter table public.shows
  add column if not exists merch boolean not null default false;

alter table public.shows
  add column if not exists revenue_type text not null default 'Ticketed'
    check (revenue_type in ('Ticketed', 'Flat fee'));

alter table public.shows
  add column if not exists flat_fee numeric(12, 2)
    check (flat_fee is null or flat_fee >= 0);

create table if not exists public.monthly_other_revenue (
  id         uuid primary key default gen_random_uuid(),
  month      date not null check (extract(day from month) = 1),
  label      text not null,
  amount     numeric(12, 2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.day_markers (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  label      text not null,
  type       text not null default 'event' check (type in ('holiday', 'event')),
  note       text,
  created_at timestamptz not null default now()
);

-- Same as the existing tables: the app reads and writes only from the server
-- with the service role key, so RLS is enabled with no policies.
alter table public.monthly_other_revenue enable row level security;
alter table public.day_markers enable row level security;
