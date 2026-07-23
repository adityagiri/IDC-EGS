-- AMC Command Center v3 — Roles, Expenses, Feedback
-- IMPORTANT: replace YOUR-ADMIN-EMAIL below with your own login email BEFORE running.

create table if not exists staff_roles (
  email text primary key,
  role text not null default 'engineer',  -- admin | accounts | engineer
  name text,
  created_at timestamptz default now()
);

insert into staff_roles (email, role, name)
values ('YOUR-ADMIN-EMAIL', 'admin', 'Santosh Giri')
on conflict (email) do update set role = 'admin';

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  engineer text not null,
  date date not null,
  customer_id uuid references customers(id) on delete set null,
  from_location text,
  to_location text,
  travel_mode text,
  amount numeric not null default 0,
  notes text,
  status text not null default 'Pending',  -- Pending | Approved | Rejected | Paid
  approved_by text,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets(id) on delete cascade,
  problem_resolved text,        -- Yes / No
  outstanding_issues text,      -- Yes / No + details
  recommendations text,
  rating int,                   -- 1-5 satisfaction
  submitted_by text,
  created_at timestamptz default now()
);

alter table staff_roles enable row level security;
alter table expenses enable row level security;
alter table feedback enable row level security;

-- Roles: everyone logged in can read (app needs it); only admins manage (or anyone if table somehow empty — bootstrap safety)
create policy roles_read on staff_roles for select to authenticated using (true);
create policy roles_manage on staff_roles for all to authenticated
  using (exists (select 1 from staff_roles s where s.email = auth.jwt()->>'email' and s.role = 'admin')
         or not exists (select 1 from staff_roles))
  with check (exists (select 1 from staff_roles s where s.email = auth.jwt()->>'email' and s.role = 'admin')
         or not exists (select 1 from staff_roles));

-- Expenses: engineers submit + see their own; admin/accounts see and manage all (enforced by the DATABASE, not just the app)
create policy exp_insert_own on expenses for insert to authenticated
  with check (engineer = auth.jwt()->>'email');
create policy exp_select on expenses for select to authenticated
  using (engineer = auth.jwt()->>'email'
         or exists (select 1 from staff_roles s where s.email = auth.jwt()->>'email' and s.role in ('admin','accounts')));
create policy exp_update_mgmt on expenses for update to authenticated
  using (exists (select 1 from staff_roles s where s.email = auth.jwt()->>'email' and s.role in ('admin','accounts'))
         or (engineer = auth.jwt()->>'email' and status = 'Pending'));
create policy exp_delete on expenses for delete to authenticated
  using (exists (select 1 from staff_roles s where s.email = auth.jwt()->>'email' and s.role = 'admin')
         or (engineer = auth.jwt()->>'email' and status = 'Pending'));

-- Feedback: customers submit WITHOUT login (public link from email); only staff can read
create policy fb_insert_public on feedback for insert to anon with check (true);
create policy fb_insert_auth on feedback for insert to authenticated with check (true);
create policy fb_read on feedback for select to authenticated using (true);
