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
  ('loma_negra',    'company',     'Cementera del Valle',    'La mayor productora de cemento del país.',                           9800,   0.70, 'Córdoba',            'medium', 'El consumo de cemento es un indicador adelantado de la actividad económica. Toda obra pública o privada en el país depende de esta industria.', '🏗️', null,         0),
  ('globant',       'company',     'BSSoft S.A.',            'Unicornio tecnológico cotizando en bolsas internacionales.',        62000,  1.00, 'Buenos Aires',       'medium', 'Las empresas de software argentinas aprovechan el talento local para exportar servicios tecnológicos, generando divisas genuinas.',               '💻', 'financial',  15),
  ('loft_rosario',  'real_estate', 'Loft en Rosario',        'Loft moderno en Pichincha, Rosario, la ciudad industrial del litoral.', 68000, 0.50, 'Rosario, Santa Fe', 'low',  'Rosario es la segunda ciudad más importante y el mayor polo agroexportador del mundo. Sus propiedades ofrecen rentabilidad accesible.',           '🏘️', null,         0),
  ('estancia_patagonia','real_estate','Estancia Patagónica', '500 ha en la Patagonia con vista al lago y turismo rural de lujo.', 480000, 1.30, 'Bariloche, Río Negro','medium','Las estancias patagónicas combinan ganadería ovina y turismo de lujo internacional. Activos dolarizados con alta demanda exterior.',             '🏔️', 'real_estate',40),
  ('soja_pampa',    'agriculture', 'Soja Pampeana',          'Campos de soja en la pampa húmeda, corazón agrícola del país.',    28000,  0.90, 'Rosario, Santa Fe',  'medium', 'Argentina es el tercer exportador mundial de soja. La cosecha gruesa financia parte sustancial del gasto público vía retenciones.',              '🌿', null,         0),
  ('bodega_lujan',  'agriculture', 'Bodega Luján de Cuyo',   'Bodega boutique con Malbec premium para el mercado de exportación.',95000,  1.20, 'Luján de Cuyo, Mendoza','medium','El Malbec de alta gama de Mendoza se vende a 40-80 dólares la botella en Europa. Las bodegas boutique que exportan directamente tienen altos márgenes.','🍷', null, 0),
  ('feedlot_pampas','agriculture', 'Ganadería Pampeana',     'Engorde a corral de novillos en la provincia de Buenos Aires.',     42000,  0.80, 'Buenos Aires',       'medium', 'Argentina tiene la mayor cantidad de ganado vacuno per cápita del mundo. La ganadería genera exportaciones que producen divisas.',               '🐄', null,         0),
  ('limon_tucuman', 'agriculture', 'Citricultura Tucumana',  'Plantaciones de limón en Tucumán, la mayor provincia productora.',  19500,  0.70, 'Tucumán',            'low',    'El norte argentino domina la producción mundial de limón. Argentina exporta el 30% de la oferta global, un caso de especialización regional.', '🍋', null,         0),
  ('hotel_bariloche','tourism',    'Hotel Boutique Bariloche','Hotel 5 estrellas con vista al lago Nahuel Huapi, Patagonia.',    185000, 1.10, 'Bariloche, Río Negro','medium', 'Bariloche tiene doble temporada —nieve en invierno y senderismo en verano— con ocupación casi permanente. El turismo patagónico cotiza en USD.',  '⛷️', null,         0),
  ('cataratas_lodge','tourism',    'Lodge en Cataratas',     'Eco-lodge junto a las Cataratas del Iguazú, Patrimonio Mundial.',  220000, 1.30, 'Misiones',            'medium', 'Las Cataratas del Iguazú son el destino turístico más visitado del país. El turismo en divisas es uno de los pocos ingresos genuinos en USD.',   '💧', 'tourism',    15),
  ('tango_bar',     'tourism',     'Milonga en San Telmo',   'Bar de tango con show nocturno en el histórico barrio de San Telmo.', 55000, 0.90, 'San Telmo, CABA',   'medium', 'El tango es Patrimonio Inmaterial UNESCO y genera cientos de millones en turismo cultural. San Telmo tiene la mayor densidad de milongas.',      '💃', null,         0),
  ('solar_san_juan','energy',      'Planta Solar San Juan',  'Parque fotovoltaico de 50MW en la zona de mayor irradiación solar.',145000, 0.85, 'San Juan',            'low',    'San Juan tiene 320 días de sol por año. Los parques solares bajo programas de renovables tienen contratos de compra garantizados a 20 años en USD.','☀️', null,        0),
  ('eolico_chubut', 'energy',      'Parque Eólico Patagónico','Aerogeneradores en la estepa chubutense, vientos de 60 km/h.',   195000, 1.00, 'Chubut',              'low',    'La Patagonia tiene el mayor potencial eólico del hemisferio sur. El viento patagónico sopla 300 días al año con intensidad constante.',         '🌬️', 'energy',     10),
  ('vaca_muerta_pozo','energy',    'Pozo en Vaca Muerta',    'Participación en pozo de shale oil en la mayor reserva no convencional fuera de EEUU.', 380000, 1.80, 'Neuquén', 'high', 'Vaca Muerta tiene reservas para convertir al país en exportador neto de energía por más de 50 años. Alta inversión inicial, retornos muy altos.', '🔥', 'energy', 30)
on conflict (id) do update set
  name            = excluded.name,
  description     = excluded.description,
  educational_note = excluded.educational_note;

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
