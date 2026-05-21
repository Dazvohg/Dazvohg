-- Subscriptions table for Mango Pro (MercadoPago + Stripe)
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  provider        text not null check (provider in ('mercadopago', 'stripe')),
  provider_sub_id text not null,
  status          text not null check (status in ('active', 'cancelled', 'past_due', 'trialing')),
  current_period_end timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (provider, provider_sub_id)
);

alter table public.subscriptions enable row level security;

-- Users can only read their own subscription
create policy "read_own_subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Only service role (Edge Functions) can write
create policy "service_write" on public.subscriptions
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Helper: returns true if user has an active or trialing subscription
create or replace function public.is_pro(uid uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = uid
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
$$;
