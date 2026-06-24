-- ============================================================================
-- MIGRATION — explicit publisher/provider revenue share on tenants
-- Run in the Supabase SQL editor on a database that already has schema.sql.
-- Idempotent (safe to run more than once).
--
-- Adds tenants.provider_share. Existing rows stay NULL and the app derives their
-- publisher share as the legacy remainder (1 - school_share - fq_share), so no
-- backfill is required. New/edited schools store all three shares explicitly.
-- ============================================================================
alter table tenants add column if not exists provider_share numeric;
