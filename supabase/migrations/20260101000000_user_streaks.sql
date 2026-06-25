-- Migration: Système de flammes (streaks quotidiens)
-- Date: 2026-01-01
-- Description: Suit la série de jours consécutifs pendant lesquels l'utilisateur
--              a passé au moins 2 minutes dans l'application.

-- Helper: fonction générique de mise à jour de updated_at
-- (réutilisable par d'autres tables)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_visit_date date,           -- YYYY-MM-DD du dernier jour validé
  last_session_at timestamptz,    -- Dernier moment où la session a atteint 2 min
  total_flames integer not null default 0, -- Nombre total de flammes cumulées (stat fun)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pour les requêtes admin / leaderboard
create index if not exists user_streaks_current_idx
  on public.user_streaks (current_streak desc);

-- RLS: l'utilisateur ne peut lire / modifier que sa propre ligne
alter table public.user_streaks enable row level security;

drop policy if exists "Users can read own streak" on public.user_streaks;
create policy "Users can read own streak"
  on public.user_streaks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can upsert own streak" on public.user_streaks;
create policy "Users can upsert own streak"
  on public.user_streaks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own streak" on public.user_streaks;
create policy "Users can update own streak"
  on public.user_streaks for update
  using (auth.uid() = user_id);

-- Trigger: maintien updated_at
drop trigger if exists trg_user_streaks_updated_at on public.user_streaks;
create trigger trg_user_streaks_updated_at
  before update on public.user_streaks
  for each row execute function public.set_updated_at();
