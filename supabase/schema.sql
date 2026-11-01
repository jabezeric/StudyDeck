-- StudyDeck cloud backup schema.
-- Run this once in your Supabase project: SQL editor -> New query -> Run.

create table if not exists public.studydeck_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- One row per user, readable and writable only by that user.
alter table public.studydeck_snapshots enable row level security;

drop policy if exists "studydeck read own" on public.studydeck_snapshots;
create policy "studydeck read own"
  on public.studydeck_snapshots for select
  using (auth.uid() = user_id);

drop policy if exists "studydeck insert own" on public.studydeck_snapshots;
create policy "studydeck insert own"
  on public.studydeck_snapshots for insert
  with check (auth.uid() = user_id);

drop policy if exists "studydeck update own" on public.studydeck_snapshots;
create policy "studydeck update own"
  on public.studydeck_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "studydeck delete own" on public.studydeck_snapshots;
create policy "studydeck delete own"
  on public.studydeck_snapshots for delete
  using (auth.uid() = user_id);
