-- ============================================================================
-- MIGRATION — FocusQuest cost line items (org-wide profitability page)
-- Run in the Supabase SQL editor on a database that already has schema.sql.
-- Idempotent (safe to run more than once).
-- ============================================================================
create table if not exists fq_costs (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  amount     numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table fq_costs enable row level security;

-- FocusQuest-only: hidden from school users. Read = any FQ role; write = FQ staff
-- except the read-only FQ Viewer.
drop policy if exists fq_costs_read on fq_costs;
create policy fq_costs_read on fq_costs for select to authenticated using ( app_is_fq() );
drop policy if exists fq_costs_write on fq_costs;
create policy fq_costs_write on fq_costs for all to authenticated
  using ( app_role() in ('superadmin','accountmgr','finance') )
  with check ( app_role() in ('superadmin','accountmgr','finance') );
