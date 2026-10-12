-- Stores the last time anyone pressed "Sync now" so the 5-minute limit is shared by everyone.
-- Additive only. portal_events and projections are never touched.
create table if not exists public.portal_sync_requests (
  id int primary key check (id = 1),
  last_pressed_at timestamptz not null default 'epoch'
);

insert into public.portal_sync_requests (id)
values (1)
on conflict (id) do nothing;

-- Only the server (service role) reads or writes this table.
alter table public.portal_sync_requests enable row level security;
