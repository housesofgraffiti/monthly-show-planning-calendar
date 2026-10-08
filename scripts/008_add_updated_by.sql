-- Records who last edited each show (first name). Additive only.
alter table public.shows
  add column if not exists updated_by text;
