-- AMC Command Center v2 — Assets, Tickets, Service Reports, Attendance
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  asset_code text not null unique,
  device_type text not null,
  brand text,
  model text,
  serial_number text not null,
  location text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  asset_id uuid references assets(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'Medium',
  status text not null default 'Open',
  assigned_to text,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists service_reports (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  engineer text not null,
  date date not null,
  checklist jsonb,
  result text,
  issue_category text,
  parts_replaced text,
  remarks text,
  created_at timestamptz default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  engineer text not null,
  customer_id uuid references customers(id) on delete set null,
  check_in timestamptz not null,
  check_out timestamptz,
  in_lat double precision,
  in_lng double precision,
  out_lat double precision,
  out_lng double precision,
  created_at timestamptz default now()
);

alter table assets enable row level security;
alter table tickets enable row level security;
alter table service_reports enable row level security;
alter table attendance enable row level security;

create policy "staff full access assets" on assets for all to authenticated using (true) with check (true);
create policy "staff full access tickets" on tickets for all to authenticated using (true) with check (true);
create policy "staff full access service_reports" on service_reports for all to authenticated using (true) with check (true);
create policy "staff full access attendance" on attendance for all to authenticated using (true) with check (true);
