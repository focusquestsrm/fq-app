-- ============================================================================
-- FocusQuest Strata — database schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor on a fresh project.
-- It creates the tables, the role model, and Row-Level Security so every
-- school only ever sees its own data while FocusQuest sees everything.
-- ============================================================================

-- ---- roles -----------------------------------------------------------------
do $$ begin
  create type user_role as enum
    ('superadmin','accountmgr','fqviewer','schoolexec','enrollmgr','coach','provider','finance','auditor');
exception when duplicate_object then null; end $$;

-- ---- tenants (schools / partner institutions) ------------------------------
create table if not exists tenants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  short_code   text not null,
  type         text not null default 'HBCU',
  -- Revenue splits live on the providers table, not the tenant.
  contact      text default '',
  dsa          text default 'Not started',      -- data-sharing agreement
  billing      text default 'Prospect',
  live         boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---- profiles (extends auth.users) -----------------------------------------
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text default '',
  email      text default '',
  role       user_role not null default 'auditor',
  tenant_id  uuid references tenants(id) on delete set null,
  status     text not null default 'Active',
  created_at timestamptz not null default now()
);

-- ---- programs (catalog) ----------------------------------------------------
create table if not exists programs (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  provider   text default '',
  cost       numeric not null default 0,
  goal       integer not null default 25,       -- cohort size (25 students per program)
  cap        integer default 0,
  cert       text default '',
  hours      integer default 0,
  weeks      integer default 0,
  category   text default 'Allied Health',
  delivery   text default 'Online',
  funding    text[] default '{}',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---- students (enrollments) ------------------------------------------------
create table if not exists students (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  program_id uuid references programs(id) on delete set null,
  first_name text not null,
  last_name  text not null,
  program    text default '',
  provider   text default '',
  cost       numeric not null default 0,
  stage      integer not null default 7,        -- 0..13 journey index
  payment    text default '',
  collected  numeric not null default 0,
  start_date text default '',
  end_date   text default '',
  checklist  jsonb default '[]'::jsonb,
  help       text[] default '{}',
  created_at timestamptz not null default now()
);

-- ---- leads -----------------------------------------------------------------
create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  first_name  text not null,
  last_name   text not null,
  phone       text default '',
  program     text default '',
  source      text default 'Manual',
  disposition text default 'Contacted',
  stage       integer not null default 2,        -- "Sent to provider" (LeadHoop routes instantly)
  days        integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---- configurable lists (types / providers / payments / dispositions) ------
create table if not exists config_items (
  id    uuid primary key default gen_random_uuid(),
  kind  text not null check (kind in ('type','provider','payment','disposition','category','funding')),
  value text not null,
  color text default '',
  sort  integer default 0
);

-- ---- FocusQuest cost line items (org-wide profitability; FQ-only) ----------
create table if not exists fq_costs (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  amount     numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ---- providers (each carries its own revenue split) ------------------------
create table if not exists providers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  provider_share numeric not null default 0.40,  -- 0..1
  school_share   numeric not null default 0.40,  -- 0..1
  fq_share       numeric not null default 0.20,  -- 0..1
  sort           integer default 0,
  created_at     timestamptz not null default now()
);

-- ============================================================================
-- Helper functions for RLS  (security definer so they can read profiles)
-- ============================================================================
create or replace function app_role() returns user_role
  language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function app_tenant() returns uuid
  language sql stable security definer set search_path = public as $$
  select tenant_id from profiles where id = auth.uid()
$$;

create or replace function app_is_fq() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('superadmin','accountmgr','finance','fqviewer'), false)
$$;

create or replace function app_can_edit() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('superadmin','accountmgr','schoolexec','enrollmgr'), false)
$$;

-- FQ admins (owner + FQ Admin) can edit users across all schools.
create or replace function app_is_fq_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('superadmin','accountmgr'), false)
$$;

-- Who may manage user rows: FQ admins + School Admins (their own school only).
create or replace function app_can_manage_users() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('superadmin','accountmgr','schoolexec'), false)
$$;

-- ============================================================================
-- New-user trigger: create a profile; the very first user becomes superadmin.
-- ============================================================================
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  select count(*) = 0 into first_user from profiles;
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email,
    case when first_user then 'superadmin'::user_role else 'auditor'::user_role end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table tenants      enable row level security;
alter table profiles     enable row level security;
alter table programs     enable row level security;
alter table students     enable row level security;
alter table leads        enable row level security;
alter table config_items enable row level security;
alter table providers    enable row level security;
alter table fq_costs     enable row level security;

-- tenants -------------------------------------------------------------------
drop policy if exists tenants_read on tenants;
create policy tenants_read on tenants for select to authenticated
  using ( app_is_fq() or id = app_tenant() );
drop policy if exists tenants_write on tenants;
create policy tenants_write on tenants for all to authenticated
  using ( app_is_fq() ) with check ( app_is_fq() );

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select to authenticated
  using ( id = auth.uid() or app_is_fq() or tenant_id = app_tenant() );
-- Update: yourself, OR an FQ admin (anyone), OR a School Admin editing one of
-- their own school's school-level users. The new row must stay school-scoped so
-- a School Admin can't move someone to FQ access or another school.
drop policy if exists profiles_self_update on profiles;
drop policy if exists profiles_manage_update on profiles;
create policy profiles_manage_update on profiles for update to authenticated
  using (
    id = auth.uid()
    or app_is_fq_admin()
    or ( app_role() = 'schoolexec' and tenant_id = app_tenant() )
  )
  with check (
    id = auth.uid()
    or app_is_fq_admin()
    or ( app_role() = 'schoolexec' and tenant_id = app_tenant()
         and role in ('schoolexec','enrollmgr','auditor') )
  );
drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles for insert to authenticated
  with check ( app_is_fq() );

-- a generic tenant-scoped policy helper pattern, applied to each data table
-- programs ------------------------------------------------------------------
drop policy if exists programs_read on programs;
create policy programs_read on programs for select to authenticated
  using ( app_is_fq() or tenant_id = app_tenant() );
drop policy if exists programs_write on programs;
create policy programs_write on programs for all to authenticated
  using ( app_is_fq() or (tenant_id = app_tenant() and app_can_edit()) )
  with check ( app_is_fq() or (tenant_id = app_tenant() and app_can_edit()) );

-- students ------------------------------------------------------------------
drop policy if exists students_read on students;
create policy students_read on students for select to authenticated
  using ( app_is_fq() or tenant_id = app_tenant() );
drop policy if exists students_write on students;
create policy students_write on students for all to authenticated
  using ( app_is_fq() or (tenant_id = app_tenant() and app_can_edit()) )
  with check ( app_is_fq() or (tenant_id = app_tenant() and app_can_edit()) );

-- leads ---------------------------------------------------------------------
drop policy if exists leads_read on leads;
create policy leads_read on leads for select to authenticated
  using ( app_is_fq() or tenant_id = app_tenant() );
drop policy if exists leads_write on leads;
create policy leads_write on leads for all to authenticated
  using ( app_is_fq() or (tenant_id = app_tenant() and app_can_edit()) )
  with check ( app_is_fq() or (tenant_id = app_tenant() and app_can_edit()) );

-- config_items: everyone authenticated can read; only FQ can edit -----------
drop policy if exists config_read on config_items;
create policy config_read on config_items for select to authenticated using ( true );
drop policy if exists config_write on config_items;
create policy config_write on config_items for all to authenticated
  using ( app_is_fq() ) with check ( app_is_fq() );

-- providers: everyone authenticated can read; only FQ can edit ---------------
drop policy if exists providers_read on providers;
create policy providers_read on providers for select to authenticated using ( true );
drop policy if exists providers_write on providers;
create policy providers_write on providers for all to authenticated
  using ( app_is_fq() ) with check ( app_is_fq() );

-- fq_costs: FocusQuest-only (hidden from schools). Read = any FQ; write = FQ
-- staff except the read-only FQ Viewer.
drop policy if exists fq_costs_read on fq_costs;
create policy fq_costs_read on fq_costs for select to authenticated using ( app_is_fq() );
drop policy if exists fq_costs_write on fq_costs;
create policy fq_costs_write on fq_costs for all to authenticated
  using ( app_role() in ('superadmin','accountmgr','finance') )
  with check ( app_role() in ('superadmin','accountmgr','finance') );
