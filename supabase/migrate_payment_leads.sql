-- ============================================================================
-- MIGRATION — add "Title II" payment source + default new leads to "Sent to provider"
-- Run in the Supabase SQL editor on a database that already has schema.sql.
-- Idempotent (safe to run more than once).
-- ============================================================================

-- "Title II" payment source (only if missing — config_items has no unique key).
insert into config_items (kind, value, sort)
select 'payment', 'Title II', 6
where not exists (select 1 from config_items c where c.kind = 'payment' and c.value = 'Title II');

-- New leads arrive via LeadHoop and route to the provider near-instantly, so they
-- start at stage 2 ("Sent to provider"). Stages can still be skipped/changed.
alter table leads alter column stage set default 2;
