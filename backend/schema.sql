-- HandLingo — Supabase schema + RLS policies
-- Run this in the Supabase SQL Editor (dashboard → SQL Editor → New query).
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE.

-- ============================================================
-- 0. Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. Enum
-- ============================================================
do $$ begin
  create type progress_status as enum ('locked', 'active', 'completed');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 2. Tables
-- ============================================================

-- 2a. levels  (essentially static reference data — seeded once)
create table if not exists public.levels (
  level_id     uuid primary key default gen_random_uuid(),
  title        text        not null,
  order_index  integer     not null unique
);

-- 2b. sublevels  (child of levels)
create table if not exists public.sublevels (
  sublevel_id     uuid primary key default gen_random_uuid(),
  level_id        uuid        not null references public.levels(level_id) on delete cascade,
  sign_target     text        not null,       -- e.g. "Hello"
  demo_media_url  text        not null,       -- URL to demo GIF/video in Supabase Storage
  required_reps   integer     not null check (required_reps >= 1),
  order_index     integer     not null,
  unique (level_id, order_index)
);

-- 2c. users  (one row per auth.users entry; created via trigger below)
create table if not exists public.users (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  current_level  uuid references public.levels(level_id) on delete set null,
  created_at     timestamptz not null default now()
);

-- 2d. user_progress  (one row per (user, sublevel) pair attempted)
create table if not exists public.user_progress (
  user_id      uuid              not null references public.users(user_id) on delete cascade,
  sublevel_id  uuid              not null references public.sublevels(sublevel_id) on delete cascade,
  status       progress_status   not null default 'locked',
  updated_at   timestamptz       not null default now(),
  primary key (user_id, sublevel_id)
);

-- Index to speed up per-user progress lookups
create index if not exists idx_user_progress_user_id on public.user_progress(user_id);

-- ============================================================
-- 3. Trigger — auto-create public.users row on sign-up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  first_sublevel_id uuid;
begin
  insert into public.users (user_id)
  values (new.id)
  on conflict do nothing;

  -- Unlock the very first sublevel so new users aren't stuck with a fully locked roadmap.
  select sublevel_id into first_sublevel_id
  from public.sublevels
  order by
    (select order_index from public.levels l where l.level_id = sublevels.level_id),
    order_index
  limit 1;

  if first_sublevel_id is not null then
    insert into public.user_progress (user_id, sublevel_id, status)
    values (new.id, first_sublevel_id, 'active')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 4. Row-Level Security
-- ============================================================

-- levels — any authenticated user can read; nobody writes via API
alter table public.levels enable row level security;
drop policy if exists "levels: authenticated read" on public.levels;
create policy "levels: authenticated read"
  on public.levels for select
  to authenticated
  using (true);

-- sublevels — any authenticated user can read
alter table public.sublevels enable row level security;
drop policy if exists "sublevels: authenticated read" on public.sublevels;
create policy "sublevels: authenticated read"
  on public.sublevels for select
  to authenticated
  using (true);

-- users — each user sees and updates only their own row
alter table public.users enable row level security;
drop policy if exists "users: own row select" on public.users;
drop policy if exists "users: own row update" on public.users;
create policy "users: own row select"
  on public.users for select
  to authenticated
  using (user_id = auth.uid());
create policy "users: own row update"
  on public.users for update
  to authenticated
  using (user_id = auth.uid());

-- user_progress — each user reads/writes only their own rows
alter table public.user_progress enable row level security;
drop policy if exists "user_progress: own rows select" on public.user_progress;
drop policy if exists "user_progress: own rows insert" on public.user_progress;
drop policy if exists "user_progress: own rows update" on public.user_progress;
create policy "user_progress: own rows select"
  on public.user_progress for select
  to authenticated
  using (user_id = auth.uid());
create policy "user_progress: own rows insert"
  on public.user_progress for insert
  to authenticated
  with check (user_id = auth.uid());
create policy "user_progress: own rows update"
  on public.user_progress for update
  to authenticated
  using (user_id = auth.uid());
