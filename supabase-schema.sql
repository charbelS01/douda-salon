-- Run this in your Supabase SQL Editor (supabase.com → project → SQL Editor → New query)

-- Categories
create table if not exists categories (
  id text primary key,
  name text not null,
  is_nail_related boolean not null default false,
  created_at timestamptz default now()
);

-- Services
create table if not exists services (
  id text primary key,
  name text not null,
  price numeric not null default 0,
  category_id text references categories(id) on delete cascade,
  created_at timestamptz default now()
);

-- Employees
create table if not exists employees (
  id text primary key,
  name text not null,
  pin text not null,
  created_at timestamptz default now()
);

-- Work logs
create table if not exists work_logs (
  id text primary key,
  employee_id text references employees(id) on delete set null,
  employee_name text not null,
  client_name text not null,
  service_id text,
  service_name text not null,
  service_price numeric not null default 0,
  amount_paid numeric not null default 0,
  payment_method text not null default 'cash',
  color_code text,
  notes text,
  category_id text,
  category_name text not null,
  start_iso timestamptz not null,
  end_iso timestamptz not null,
  created_at timestamptz default now()
);

-- Appointments
create table if not exists appointments (
  id text primary key,
  client_name text not null,
  employee_id text references employees(id) on delete set null,
  employee_name text not null,
  service_id text,
  service_name text not null,
  category_id text,
  category_name text not null,
  date_iso timestamptz not null,
  time_iso timestamptz not null,
  notes text,
  notified boolean default false,
  created_at timestamptz default now()
);

-- Expenses
create table if not exists expenses (
  id text primary key,
  category text not null,
  label text not null,
  amount numeric not null default 0,
  payment_method text not null default 'cash',
  date_iso timestamptz not null,
  notes text,
  created_at timestamptz default now()
);

-- Admin config (PIN etc)
create table if not exists admin_config (
  key text primary key,
  value text not null
);

-- Seed the admin PIN
insert into admin_config (key, value) values ('admin_pin', '1234') on conflict do nothing;

-- Enable realtime on all tables
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table services;
alter publication supabase_realtime add table employees;
alter publication supabase_realtime add table work_logs;
alter publication supabase_realtime add table appointments;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table admin_config;

-- Allow anonymous access (the app uses PIN auth, not Supabase auth)
-- RLS policies: allow all operations for anon role

alter table categories enable row level security;
create policy "anon_all_categories" on categories for all using (true) with check (true);

alter table services enable row level security;
create policy "anon_all_services" on services for all using (true) with check (true);

alter table employees enable row level security;
create policy "anon_all_employees" on employees for all using (true) with check (true);

alter table work_logs enable row level security;
create policy "anon_all_work_logs" on work_logs for all using (true) with check (true);

alter table appointments enable row level security;
create policy "anon_all_appointments" on appointments for all using (true) with check (true);

alter table expenses enable row level security;
create policy "anon_all_expenses" on expenses for all using (true) with check (true);

alter table admin_config enable row level security;
create policy "anon_all_admin_config" on admin_config for all using (true) with check (true);
