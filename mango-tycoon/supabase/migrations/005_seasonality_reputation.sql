-- ============================================================
-- MANGO TYCOON — Seasonality & Reputation System
-- ============================================================

-- ── Player reputation per sector ────────────────────────────
create table if not exists player_reputation (
  player_id  uuid references profiles(id) on delete cascade not null,
  sector     text not null,  -- financial, real_estate, sports, agro, energy, tourism
  points     integer not null default 0 check (points >= 0 and points <= 100),
  updated_at timestamptz not null default now(),
  primary key (player_id, sector)
);

alter table player_reputation enable row level security;
create policy "players manage own reputation"
  on player_reputation for all
  using (auth.uid() = player_id)
  with check (auth.uid() = player_id);

-- ── Own companies ────────────────────────────────────────────
create table if not exists own_companies (
  id                uuid primary key default gen_random_uuid(),
  player_id         uuid references profiles(id) on delete cascade not null unique,
  name              text not null,
  type              text not null,
  sector            text not null,
  capital_invested  integer not null default 0,
  yield_rate        numeric(5,2) not null default 0.8,
  founded_at        timestamptz not null default now(),
  last_event_at     timestamptz,
  last_event_desc   text,
  last_event_delta  integer not null default 0
);

alter table own_companies enable row level security;
create policy "players manage own company"
  on own_companies for all
  using (auth.uid() = player_id)
  with check (auth.uid() = player_id);

-- ── Seasonal state (singleton, id=1) ────────────────────────
create table if not exists seasonal_state (
  id              integer primary key default 1 check (id = 1),
  season          text not null default 'verano',
  label           text not null default 'Verano Argentino',
  icon            text not null default '☀️',
  description     text not null default '',
  active_bonuses  jsonb not null default '[]',
  updated_at      timestamptz not null default now()
);

-- Seed default seasonal state
insert into seasonal_state (id, season, label, icon, description, active_bonuses)
values (
  1,
  'verano',
  'Verano Argentino',
  '☀️',
  'Temporada alta de turismo y consumo.',
  '[{"assetType":"tourism","multiplier":1.4,"label":"+40% turismo"},{"assetType":"real_estate","multiplier":1.15,"label":"+15% inmuebles"}]'
)
on conflict (id) do nothing;

-- ── Add market_assets columns for new types if not exist ────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'market_assets' and column_name = 'required_rep_sector'
  ) then
    alter table market_assets add column required_rep_sector text;
    alter table market_assets add column required_rep_points integer default 0;
  end if;
end $$;

-- ── Seed new assets for open world ────────────────────────────
insert into market_assets
  (id, type, name, description, price, yield_rate, location, risk_level, educational_note, icon, required_rep_sector, required_rep_points)
values
  ('loma_negra',    'company',     'Loma Negra',            'La mayor cementera de Argentina.',                                  9800,   0.70, 'Córdoba',            'medium', 'Loma Negra produce el 40% del cemento argentino.',                                    '🏗️', null,         0),
  ('globant',       'company',     'Globant',               'Unicornio tecnológico argentino cotizando en NYSE.',               62000,  1.00, 'Buenos Aires',       'medium', 'Globant fue fundada en Buenos Aires en 2003 y vale más de 3.000M USD.',               '💻', 'financial',  15),
  ('loft_rosario',  'real_estate', 'Loft en Rosario',       'Loft moderno en Pichincha, la ciudad de Messi.',                  68000,  0.50, 'Rosario, Santa Fe',  'low',    'Rosario es la segunda ciudad y el mayor polo agroexportador del mundo.',              '🏘️', null,         0),
  ('estancia_patagonia', 'real_estate', 'Estancia Patagónica', '500 ha en la Patagonia con turismo rural.',                   480000, 1.30, 'Bariloche, Río Negro','medium', 'Las estancias patagónicas combinan ganadería ovina y turismo de lujo.',              '🏔️', 'real_estate',40),
  ('soja_pampa',    'agriculture', 'Soja Pampeana',         'Campos de soja en la pampa húmeda.',                              28000,  0.90, 'Rosario, Santa Fe',  'medium', 'Argentina es el tercer exportador mundial de soja.',                                  '🌿', null,         0),
  ('bodega_lujan',  'agriculture', 'Bodega Luján de Cuyo',  'Bodega boutique con Malbec premium para exportación.',            95000,  1.20, 'Luján de Cuyo, Mendoza','medium','El Malbec de Luján de Cuyo gana premios internacionales.',                           '🍷', null,         0),
  ('feedlot_pampas','agriculture', 'Feedlot Pampeano',      'Engorde a corral de novillos en Buenos Aires.',                   42000,  0.80, 'Buenos Aires',       'medium', 'Argentina tiene la mayor cantidad de ganado vacuno per cápita del mundo.',            '🐄', null,         0),
  ('limon_tucuman', 'agriculture', 'Citricultura Tucumana', 'Plantaciones de limón en Tucumán, el mayor productor mundial.',   19500,  0.70, 'Tucumán',            'low',    'Tucumán produce el 80% del limón argentino.',                                         '🍋', null,         0),
  ('hotel_bariloche','tourism',    'Hotel Boutique Bariloche','Hotel 5 estrellas con vista al lago Nahuel Huapi.',             185000, 1.10, 'Bariloche, Río Negro','medium', 'Bariloche recibe 1 millón de turistas por año.',                                      '⛷️', null,         0),
  ('cataratas_lodge','tourism',    'Lodge en Cataratas',    'Eco-lodge junto a las Cataratas del Iguazú.',                    220000, 1.30, 'Misiones',            'medium', 'Las Cataratas reciben 1,5M turistas anuales.',                                        '💧', 'tourism',    15),
  ('tango_bar',     'tourism',     'Milonga en San Telmo',  'Bar de tango con show nocturno en San Telmo.',                    55000,  0.90, 'San Telmo, CABA',    'medium', 'El tango genera 500M USD anuales en turismo cultural.',                               '💃', null,         0),
  ('solar_san_juan','energy',      'Planta Solar San Juan', 'Parque fotovoltaico de 50MW en Zonda.',                          145000, 0.85, 'San Juan',            'low',    'San Juan tiene 320 días de sol por año.',                                             '☀️', null,         0),
  ('eolico_chubut', 'energy',      'Parque Eólico Patagónico','Aerogeneradores en la estepa chubutense.',                    195000, 1.00, 'Chubut',              'low',    'La Patagonia tiene el mayor potencial eólico del hemisferio sur.',                    '🌬️', 'energy',     10),
  ('vaca_muerta_pozo','energy',    'Pozo en Vaca Muerta',   'Participación en pozo de shale oil en Vaca Muerta.',             380000, 1.80, 'Neuquén',             'high',   'Vaca Muerta tiene 27.000M de barriles de petróleo.',                                  '🔥', 'energy',     30)
on conflict (id) do nothing;

-- ── Cron job for sync-seasonality ────────────────────────────
-- Run once per day at 03:00 UTC to update seasonal bonuses
-- select cron.schedule(
--   'sync-seasonality',
--   '0 3 * * *',
--   $$
--   select
--     net.http_post(
--       url := current_setting('app.supabase_url') || '/functions/v1/sync-seasonality',
--       headers := jsonb_build_object(
--         'Content-Type',  'application/json',
--         'x-scheduled',   'true',
--         'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
--       ),
--       body := '{}'::jsonb
--     ) as request_id;
--   $$
-- );
