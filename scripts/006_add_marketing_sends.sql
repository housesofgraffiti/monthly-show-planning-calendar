-- Adds the marketing_sends table (email and SMS sends shown on the calendar).
-- Additive only: it creates one new table and an index. No drops, deletes, or
-- changes to shows, projections, or portal_events.

create table if not exists public.marketing_sends (
  id                uuid primary key default gen_random_uuid(),
  send_date         date not null,
  name              text not null,
  channel           text not null default 'Email' check (channel in ('Email', 'SMS')),
  segment           text,
  assigned_to       text,
  status            text not null default 'Planned' check (status in ('Planned', 'Scheduled', 'Sent')),
  notes             text,
  featured_show_ids uuid[] not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists marketing_sends_send_date_idx
  on public.marketing_sends (send_date);

-- Same as the other tables: the app reads and writes only from the server with
-- the service role key, so RLS is enabled with no policies.
alter table public.marketing_sends enable row level security;
