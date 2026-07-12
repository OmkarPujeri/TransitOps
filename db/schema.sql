-- TransitOps — LOCAL PostgreSQL schema (self-hosted, no Supabase).
--
-- Differences from the old supabase/schema.sql:
--   * No auth.users — a local `users` table holds email + bcrypt password_hash.
--   * `profiles` is now a VIEW over users, so existing queries keep working.
--   * No Row-Level Security (there is no auth.uid() outside Supabase). Access
--     control is enforced in the app: middleware guards page views and server
--     actions guard writes (see src/lib/permissions.ts + src/lib/authz.ts).
--   * The business-rule triggers (trip / maintenance state machines) are
--     UNCHANGED — they are plain PL/pgSQL and remain the source of truth.
--
-- Load it with:  psql "$DATABASE_URL" -f db/schema.sql

create extension if not exists "pgcrypto";

-- Enums ----------------------------------------------------------------------
do $$ begin
  create type vehicle_status as enum ('available','on_trip','in_shop','retired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type driver_status as enum ('available','on_trip','off_duty','suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trip_status as enum ('draft','dispatched','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type maintenance_status as enum ('open','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('fleet_manager','driver','safety_officer','financial_analyst');
exception when duplicate_object then null; end $$;

-- Auth: local users ----------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text,
  role app_role not null default 'fleet_manager',
  created_at timestamptz not null default now()
);

-- Back-compat: the app reads profile data via a `profiles` view.
create or replace view profiles as
  select id, full_name, role, created_at from users;

-- Domain tables --------------------------------------------------------------
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  reg_number text not null unique,
  name_model text not null,
  type text not null default 'Truck',
  max_load_kg numeric not null default 0,
  odometer numeric not null default 0,
  acquisition_cost numeric not null default 0,
  status vehicle_status not null default 'available',
  region text,
  created_at timestamptz not null default now()
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  license_number text not null unique,
  license_category text not null default 'B',
  license_expiry date not null,
  contact text,
  safety_score numeric not null default 100,
  status driver_status not null default 'available',
  created_at timestamptz not null default now()
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  destination text not null,
  vehicle_id uuid references vehicles(id) on delete set null,
  driver_id uuid references drivers(id) on delete set null,
  cargo_weight_kg numeric not null default 0,
  planned_distance_km numeric not null default 0,
  actual_distance_km numeric,
  fuel_consumed_l numeric,
  revenue numeric,
  status trip_status not null default 'draft',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  type text not null default 'Service',
  description text,
  cost numeric not null default 0,
  status maintenance_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  trip_id uuid references trips(id) on delete set null,
  liters numeric not null,
  cost numeric not null,
  logged_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete set null,
  trip_id uuid references trips(id) on delete set null,
  category text not null default 'Toll',
  amount numeric not null,
  note text,
  logged_at timestamptz not null default now()
);

create table if not exists vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  name text not null,
  path text not null,
  size bigint not null default 0,
  mime text,
  uploaded_at timestamptz not null default now()
);

-- Business rules: trip state machine (UNCHANGED from Supabase version) --------
create or replace function trip_state_machine()
returns trigger language plpgsql as $$
declare
  v vehicles%rowtype;
  d drivers%rowtype;
begin
  if new.status = 'dispatched' and (tg_op = 'INSERT' or old.status is distinct from 'dispatched') then
    select * into v from vehicles where id = new.vehicle_id;
    select * into d from drivers where id = new.driver_id;

    if v.id is null then raise exception 'A vehicle must be selected to dispatch'; end if;
    if d.id is null then raise exception 'A driver must be selected to dispatch'; end if;
    if v.status <> 'available' then
      raise exception 'Vehicle % is % and cannot be dispatched', v.reg_number, v.status;
    end if;
    if d.status <> 'available' then
      raise exception 'Driver % is % and cannot be dispatched', d.full_name, d.status;
    end if;
    if d.license_expiry < current_date then
      raise exception 'Driver % has an expired license', d.full_name;
    end if;
    if new.cargo_weight_kg > v.max_load_kg then
      raise exception 'Cargo % kg exceeds vehicle capacity of % kg', new.cargo_weight_kg, v.max_load_kg;
    end if;

    update vehicles set status = 'on_trip' where id = new.vehicle_id;
    update drivers  set status = 'on_trip' where id = new.driver_id;
  end if;

  if new.status = 'completed' and old.status = 'dispatched' then
    update vehicles
      set status = 'available',
          odometer = odometer + coalesce(new.actual_distance_km, new.planned_distance_km)
      where id = new.vehicle_id;
    update drivers set status = 'available' where id = new.driver_id;
  end if;

  if new.status = 'cancelled' and old.status = 'dispatched' then
    update vehicles set status = 'available' where id = new.vehicle_id and status = 'on_trip';
    update drivers  set status = 'available' where id = new.driver_id  and status = 'on_trip';
  end if;

  return new;
end $$;

drop trigger if exists trg_trip_state on trips;
create trigger trg_trip_state
  before insert or update on trips
  for each row execute function trip_state_machine();

-- Business rules: maintenance state machine (UNCHANGED) ----------------------
create or replace function maintenance_state_machine()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.status = 'open' then
    update vehicles set status = 'in_shop'
      where id = new.vehicle_id and status <> 'retired';
  elsif tg_op = 'UPDATE' and new.status = 'closed' and old.status = 'open' then
    new.closed_at = now();
    update vehicles set status = 'available'
      where id = new.vehicle_id and status = 'in_shop';
  end if;
  return new;
end $$;

drop trigger if exists trg_maint_state on maintenance_logs;
create trigger trg_maint_state
  before insert or update on maintenance_logs
  for each row execute function maintenance_state_machine();

-- Seed data ------------------------------------------------------------------
-- Demo login:  admin@transitops.local  /  password123
insert into users (email, password_hash, full_name, role) values
  ('admin@transitops.local', crypt('password123', gen_salt('bf')), 'Fleet Admin', 'fleet_manager')
on conflict (email) do nothing;

insert into vehicles (reg_number, name_model, type, max_load_kg, odometer, acquisition_cost, status, region) values
  ('VAN-05',  'Ford Transit 350',   'Van',   500,  42000, 38000, 'available', 'North'),
  ('TRK-11',  'Volvo FH16',         'Truck', 20000, 180000, 120000, 'available', 'North'),
  ('TRK-12',  'Scania R500',        'Truck', 18000, 96000, 110000, 'available', 'South'),
  ('VAN-08',  'Mercedes Sprinter',  'Van',   1200, 61000, 45000, 'available', 'East'),
  ('PKP-02',  'Toyota Hilux',       'Pickup', 1000, 25000, 32000, 'available', 'West'),
  ('TRK-15',  'MAN TGX',            'Truck', 22000, 210000, 130000, 'in_shop', 'South'),
  ('VAN-09',  'Renault Master',     'Van',   1500, 8000, 41000, 'available', 'North'),
  ('TRK-18',  'Iveco Stralis',      'Truck', 19000, 300000, 95000, 'retired', 'East')
on conflict (reg_number) do nothing;

insert into drivers (full_name, license_number, license_category, license_expiry, contact, safety_score, status) values
  ('Alex Morgan',   'DL-2201', 'C', current_date + 300, '+1-555-0101', 96, 'available'),
  ('Priya Nair',    'DL-2202', 'C', current_date + 120, '+1-555-0102', 88, 'available'),
  ('Diego Santos',  'DL-2203', 'B', current_date + 12,  '+1-555-0103', 74, 'available'),
  ('Mei Chen',      'DL-2204', 'C', current_date + 400, '+1-555-0104', 91, 'available'),
  ('Sam Okoye',     'DL-2205', 'B', current_date - 5,   '+1-555-0105', 65, 'available'),
  ('Lena Petrov',   'DL-2206', 'C', current_date + 210, '+1-555-0106', 82, 'off_duty'),
  ('Omar Haddad',   'DL-2207', 'C', current_date + 60,  '+1-555-0107', 40, 'suspended')
on conflict (license_number) do nothing;

-- Historical completed trip so reports have data
do $$
declare v_id uuid; d_id uuid; t_id uuid;
begin
  select id into v_id from vehicles where reg_number = 'TRK-11';
  select id into d_id from drivers  where full_name = 'Alex Morgan';
  if v_id is not null and d_id is not null
     and not exists (select 1 from trips where source = 'Chicago' and destination = 'Detroit') then
    insert into trips (source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, actual_distance_km, fuel_consumed_l, revenue, status)
    values ('Chicago','Detroit', v_id, d_id, 15000, 460, 470, 165, 4200, 'completed')
    returning id into t_id;
    insert into fuel_logs (vehicle_id, trip_id, liters, cost) values (v_id, t_id, 165, 280);
    insert into expenses (vehicle_id, trip_id, category, amount, note) values (v_id, t_id, 'Toll', 85, 'I-94 tolls');
  end if;
end $$;
