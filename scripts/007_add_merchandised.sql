alter table public.shows
  add column if not exists merchandised boolean not null default false;
