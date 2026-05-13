-- ============================================================
-- MANGO TYCOON — economy_state + price_history
-- ============================================================

-- Live economy state (single row, id = 1)
create table if not exists public.economy_state (
  id              int primary key default 1,
  dolar_blue      numeric not null default 1200,
  dolar_oficial   numeric not null default 900,
  dolar_blue_prev numeric not null default 1200,   -- yesterday's value
  inflation_monthly numeric not null default 8.5,
  inflation_annual  numeric not null default 120,
  updated_at      timestamptz not null default now()
);

alter table public.economy_state enable row level security;
create policy "economy_state public read" on public.economy_state for select using (true);

-- Seed default row
insert into public.economy_state (id) values (1) on conflict do nothing;

-- Price history (for charts)
create table if not exists public.asset_price_history (
  id         uuid primary key default gen_random_uuid(),
  asset_id   text not null references public.market_assets(id),
  price      numeric not null,
  recorded_at timestamptz not null default now()
);

create index if not exists asset_price_history_asset_id_idx
  on public.asset_price_history(asset_id, recorded_at desc);

alter table public.asset_price_history enable row level security;
create policy "price_history public read" on public.asset_price_history for select using (true);

-- Football results log (for debugging + audit)
create table if not exists public.football_results (
  id          uuid primary key default gen_random_uuid(),
  match_id    int unique,
  home_team   text not null,
  away_team   text not null,
  home_score  int,
  away_score  int,
  status      text not null default 'SCHEDULED',
  match_date  timestamptz,
  processed_at timestamptz
);

alter table public.football_results enable row level security;
create policy "football_results public read" on public.football_results for select using (true);
