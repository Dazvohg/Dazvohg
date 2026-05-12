-- ============================================================
-- MANGO TYCOON — initial schema
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text not null unique,
  level          int not null default 1,
  mango_cash     numeric not null default 2500,
  last_login     timestamptz not null default now(),
  total_invested numeric not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile read"   on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- ── market_assets ────────────────────────────────────────────
create table if not exists public.market_assets (
  id               text primary key,
  type             text not null check (type in ('company','real_estate','bond','club')),
  name             text not null,
  description      text not null default '',
  price            numeric not null,
  yield_rate       numeric not null,
  location         text not null default '',
  risk_level       text not null default 'medium' check (risk_level in ('low','medium','high')),
  educational_note text not null default '',
  icon             text not null default '📦'
);

alter table public.market_assets enable row level security;
create policy "assets public read" on public.market_assets for select using (true);

-- ── player_assets ────────────────────────────────────────────
create table if not exists public.player_assets (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.profiles(id) on delete cascade,
  asset_id     text not null references public.market_assets(id),
  bought_at    numeric not null,
  quantity     int not null default 1 check (quantity > 0),
  purchased_at timestamptz not null default now()
);

alter table public.player_assets enable row level security;
create policy "own player_assets" on public.player_assets for all using (auth.uid() = player_id);

-- ── objectives ───────────────────────────────────────────────
create table if not exists public.objectives (
  id          text primary key,
  title       text not null,
  description text not null,
  reward      numeric not null,
  condition   jsonb not null,
  category    text not null default 'investment',
  icon        text not null default '🎯'
);

alter table public.objectives enable row level security;
create policy "objectives public read" on public.objectives for select using (true);

-- ── player_objectives ────────────────────────────────────────
create table if not exists public.player_objectives (
  player_id    uuid not null references public.profiles(id) on delete cascade,
  objective_id text not null references public.objectives(id),
  completed_at timestamptz,
  primary key (player_id, objective_id)
);

alter table public.player_objectives enable row level security;
create policy "own player_objectives" on public.player_objectives for all using (auth.uid() = player_id);

-- ── economy_events ───────────────────────────────────────────
create table if not exists public.economy_events (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  title       text not null,
  description text not null,
  impact      jsonb not null default '{}',
  active_from timestamptz not null default now(),
  active_to   timestamptz not null default (now() + interval '24 hours')
);

alter table public.economy_events enable row level security;
create policy "active events read" on public.economy_events
  for select using (active_to > now());
