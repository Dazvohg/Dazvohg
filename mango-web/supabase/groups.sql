-- Grupos compartidos (gastos de pareja, roomies, viajes, etc.)

create table if not exists public.shared_groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  created_by   uuid not null references auth.users(id) on delete cascade,
  invite_token uuid not null default gen_random_uuid(),
  created_at   timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id     uuid not null references public.shared_groups(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  joined_at    timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.shared_groups(id) on delete cascade,
  added_by     uuid not null references auth.users(id) on delete cascade,
  category     text not null,
  amount       numeric not null check (amount > 0),
  description  text not null default '',
  date         date not null default current_date,
  created_at   timestamptz not null default now()
);

-- RLS
alter table public.shared_groups   enable row level security;
alter table public.group_members   enable row level security;
alter table public.group_expenses  enable row level security;

-- shared_groups: miembros ven su grupo, creador puede borrar
create policy "members_see_group" on public.shared_groups
  for select using (
    auth.uid() = created_by or
    exists (select 1 from public.group_members m where m.group_id = id and m.user_id = auth.uid())
  );

create policy "creator_insert_group" on public.shared_groups
  for insert with check (auth.uid() = created_by);

create policy "creator_delete_group" on public.shared_groups
  for delete using (auth.uid() = created_by);

-- group_members: miembros ven la lista de su grupo
create policy "members_see_members" on public.group_members
  for select using (
    exists (select 1 from public.group_members m where m.group_id = group_id and m.user_id = auth.uid())
  );

create policy "self_insert_member" on public.group_members
  for insert with check (auth.uid() = user_id);

create policy "self_delete_member" on public.group_members
  for delete using (auth.uid() = user_id);

-- group_expenses: miembros ven y agregan gastos del grupo
create policy "members_see_expenses" on public.group_expenses
  for select using (
    exists (select 1 from public.group_members m where m.group_id = group_id and m.user_id = auth.uid())
  );

create policy "members_insert_expenses" on public.group_expenses
  for insert with check (
    auth.uid() = added_by and
    exists (select 1 from public.group_members m where m.group_id = group_id and m.user_id = auth.uid())
  );

create policy "owner_delete_expense" on public.group_expenses
  for delete using (auth.uid() = added_by);
