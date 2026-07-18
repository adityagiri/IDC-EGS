-- AMC Command Center — Supabase schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  venture text not null default 'IDC',
  company text not null,
  contact text,
  phone text,
  email text,
  segment text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  tier text not null default 'Silver',
  value numeric not null default 0,
  billing text not null default 'Annual',
  start_date date,
  end_date date not null,
  scope text,
  created_at timestamptz default now()
);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  date date,
  summary text not null,
  engineer text,
  created_at timestamptz default now()
);

-- Row Level Security: only signed-in staff can read/write anything.
alter table customers enable row level security;
alter table contracts enable row level security;
alter table visits enable row level security;

create policy "staff full access customers" on customers
  for all to authenticated using (true) with check (true);

create policy "staff full access contracts" on contracts
  for all to authenticated using (true) with check (true);

create policy "staff full access visits" on visits
  for all to authenticated using (true) with check (true);
