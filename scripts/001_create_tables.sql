-- Sofar Sounds LA show calendar
-- Run once in your Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.shows (
  id                uuid primary key default gen_random_uuid(),
  show_date         date not null,
  category          text not null check (category in ('Core', 'Premium', 'Special')),
  format            text not null,
  area              text,
  venue             text,
  tickets           integer check (tickets is null or tickets >= 0),
  ticket_price      numeric(10, 2) check (ticket_price is null or ticket_price >= 0),
  projected_revenue numeric(12, 2) check (projected_revenue is null or projected_revenue >= 0),
  status            text not null default 'Idea'
                    check (status in ('Idea', 'Tentative', 'Confirmed', 'Cancelled')),
  portal_event_id   text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists shows_show_date_idx on public.shows (show_date);

create table if not exists public.monthly_targets (
  month      date primary key check (extract(day from month) = 1),
  target     numeric(12, 2) not null default 0 check (target >= 0),
  updated_at timestamptz not null default now()
);

-- The app only talks to these tables from the server with the service role key,
-- which bypasses RLS. Enabling RLS with no policies blocks anon/public access.
alter table public.shows enable row level security;
alter table public.monthly_targets enable row level security;
