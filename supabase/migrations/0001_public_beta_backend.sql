-- AgentBounty public beta backend schema.
-- 核心资金状态仍在智能合约里，Supabase 只保存公开测试辅助数据。

create extension if not exists pgcrypto;

create table if not exists public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  wallet_address text,
  role text not null default 'creator',
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint beta_signups_email_format check (position('@' in email) > 1),
  constraint beta_signups_role_check check (role in ('creator', 'agent', 'builder', 'researcher'))
);

create unique index if not exists beta_signups_email_idx on public.beta_signups (lower(email));
create index if not exists beta_signups_wallet_idx on public.beta_signups (wallet_address) where wallet_address is not null;

create table if not exists public.agent_profiles (
  wallet_address text primary key,
  display_name text not null,
  bio text not null default '',
  skill_tags text[] not null default '{}',
  website_url text,
  x_handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_profiles_skill_tags_idx on public.agent_profiles using gin (skill_tags);

create table if not exists public.task_snapshots (
  id uuid primary key default gen_random_uuid(),
  chain_id integer not null,
  contract_address text not null,
  contract_task_id numeric not null,
  creator_address text not null,
  agent_address text,
  title text not null,
  category text not null,
  status text not null,
  bounty_wei numeric not null default 0,
  result_hash text,
  created_at_chain timestamptz,
  updated_at timestamptz not null default now(),
  constraint task_snapshots_status_check check (status in ('Open', 'Assigned', 'Submitted', 'Approved', 'Rejected', 'Cancelled'))
);

create unique index if not exists task_snapshots_unique_chain_task_idx
  on public.task_snapshots (chain_id, lower(contract_address), contract_task_id);

create index if not exists task_snapshots_creator_idx on public.task_snapshots (creator_address);
create index if not exists task_snapshots_agent_idx on public.task_snapshots (agent_address) where agent_address is not null;
create index if not exists task_snapshots_status_idx on public.task_snapshots (status);

create table if not exists public.contract_events (
  id uuid primary key default gen_random_uuid(),
  chain_id integer not null,
  contract_address text not null,
  event_name text not null,
  transaction_hash text not null,
  log_index integer not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create unique index if not exists contract_events_unique_log_idx
  on public.contract_events (chain_id, lower(contract_address), transaction_hash, log_index);

create index if not exists contract_events_name_idx on public.contract_events (event_name);
create index if not exists contract_events_payload_idx on public.contract_events using gin (payload);

alter table public.beta_signups enable row level security;
alter table public.agent_profiles enable row level security;
alter table public.task_snapshots enable row level security;
alter table public.contract_events enable row level security;

drop policy if exists "Public can read agent profiles" on public.agent_profiles;
create policy "Public can read agent profiles"
  on public.agent_profiles for select
  using (true);

drop policy if exists "Public can read task snapshots" on public.task_snapshots;
create policy "Public can read task snapshots"
  on public.task_snapshots for select
  using (true);

drop policy if exists "Public can read contract events" on public.contract_events;
create policy "Public can read contract events"
  on public.contract_events for select
  using (true);
