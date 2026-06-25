-- ============================================================================
-- MIGRATION — Data Intake: Provider Report Importer (Phase 2)
-- Run in the Supabase SQL editor on a database that already has schema.sql.
-- Idempotent (safe to run more than once).
-- ============================================================================

-- 1) New lead columns the importer maps into (kept nullable / defaulted).
alter table leads add column if not exists email                 text default '';
alter table leads add column if not exists raw_status            text default '';  -- provider's own status words
alter table leads add column if not exists notes                 text default '';
alter table leads add column if not exists lead_owner            text default '';
alter table leads add column if not exists projected_enroll_date text default '';
alter table leads add column if not exists projected_start_date  text default '';

-- 2) Reusable mapping PROFILE per provider format (column + value maps together).
create table if not exists import_profiles (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,                       -- e.g. "MedCerts Lead Report"
  source           text not null default '',            -- provider name
  header_signature text not null default '',            -- normalized sorted headers → auto-detect
  column_map       jsonb not null default '{}'::jsonb,  -- { theirHeader: canonicalField }
  status_map       jsonb not null default '{}'::jsonb,  -- { rawStatus: stageIndex }
  program_map      jsonb not null default '{}'::jsonb,  -- { productString: programName }
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 3) Upload batches — drafts during mapping, and the import history afterward.
create table if not exists import_batches (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete set null,
  source          text not null default '',
  file_name       text not null default '',
  headers         jsonb not null default '[]'::jsonb,   -- string[]
  rows            jsonb not null default '[]'::jsonb,   -- raw parsed rows (object[])
  profile_id      uuid references import_profiles(id) on delete set null,
  column_map      jsonb not null default '{}'::jsonb,
  status_map      jsonb not null default '{}'::jsonb,
  program_map     jsonb not null default '{}'::jsonb,
  status          text not null default 'draft',        -- draft | imported
  inserted        integer not null default 0,
  updated         integer not null default 0,
  flagged         integer not null default 0,
  created_by      uuid references auth.users(id) on delete set null,
  created_by_name text default '',
  created_at      timestamptz not null default now()
);

-- 4) RLS — FocusQuest-only (hidden from schools).
alter table import_profiles enable row level security;
alter table import_batches  enable row level security;
drop policy if exists import_profiles_all on import_profiles;
create policy import_profiles_all on import_profiles for all to authenticated
  using ( app_is_fq() ) with check ( app_is_fq() );
drop policy if exists import_batches_all on import_batches;
create policy import_batches_all on import_batches for all to authenticated
  using ( app_is_fq() ) with check ( app_is_fq() );
