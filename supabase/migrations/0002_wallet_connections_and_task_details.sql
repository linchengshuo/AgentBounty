-- Public beta backend expansion.
-- This migration adds wallet connection logs and richer task snapshot fields.

create table if not exists public.wallet_connections (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  chain_id integer,
  connector_name text not null default '',
  user_agent text not null default '',
  connected_at timestamptz not null default now()
);

create index if not exists wallet_connections_wallet_idx on public.wallet_connections (wallet_address);
create index if not exists wallet_connections_connected_at_idx on public.wallet_connections (connected_at desc);

alter table public.wallet_connections enable row level security;

drop policy if exists "Service role manages wallet connections" on public.wallet_connections;
create policy "Service role manages wallet connections"
  on public.wallet_connections for all
  using (false)
  with check (false);

alter table public.task_snapshots add column if not exists description text not null default '';
alter table public.task_snapshots add column if not exists expected_format text not null default '';
alter table public.task_snapshots add column if not exists result_text text not null default '';
alter table public.task_snapshots add column if not exists result_uri text not null default '';
alter table public.task_snapshots add column if not exists reject_reason text not null default '';
alter table public.task_snapshots add column if not exists rating integer;
alter table public.task_snapshots add column if not exists review_text text not null default '';
alter table public.task_snapshots add column if not exists last_tx_hash text;
