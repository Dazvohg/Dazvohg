-- Mango — schema inicial
-- Ejecutar en: https://supabase.com/dashboard/project/_/sql/new
--
-- Una sola tabla con el estado completo del usuario en JSONB.
-- La lógica de integridad la maneja la app (ya validada por TypeScript).

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb        not null,
  updated_at timestamptz  not null default now()
);

-- Cada usuario solo puede leer y escribir su propia fila
alter table public.user_state enable row level security;

create policy "owner_only"
  on public.user_state
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Índice para acelerar queries por updated_at si en el futuro hay admin dashboard
create index if not exists user_state_updated_at_idx
  on public.user_state (updated_at desc);
