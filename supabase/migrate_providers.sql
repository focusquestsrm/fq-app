-- ============================================================================
-- MIGRATION — Providers table with per-provider revenue splits
-- Run in the Supabase SQL editor on a database that already has schema.sql.
-- Idempotent (safe to run more than once).
-- ============================================================================
create table if not exists providers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  provider_share numeric not null default 0.40,  -- 0..1
  school_share   numeric not null default 0.40,  -- 0..1
  fq_share       numeric not null default 0.20,  -- 0..1
  sort           integer default 0,
  created_at     timestamptz not null default now()
);

alter table providers enable row level security;
drop policy if exists providers_read on providers;
create policy providers_read on providers for select to authenticated using ( true );
drop policy if exists providers_write on providers;
create policy providers_write on providers for all to authenticated
  using ( app_is_fq() ) with check ( app_is_fq() );

-- Seed the five providers (splits are editable on the Settings page afterward).
insert into providers (name, provider_share, school_share, fq_share, sort) values
  ('MedCerts', 0.40, 0.40, 0.20, 0),
  ('General Assembly', 0.40, 0.40, 0.20, 1),
  ('Quantum Power', 0.40, 0.40, 0.20, 2),
  ('Skill Up', 0.40, 0.40, 0.20, 3),
  ('FocusQuest', 0.40, 0.40, 0.20, 4)
on conflict (name) do nothing;
