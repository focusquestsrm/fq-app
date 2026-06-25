-- ============================================================================
-- MIGRATION — default cohort goal of 25 students per program
-- Run in the Supabase SQL editor on a database that already has schema.sql.
-- Idempotent. Only changes the DEFAULT for NEW programs; existing rows keep
-- their entered goal. (To also reset blank goals, uncomment the UPDATE below.)
-- ============================================================================
alter table programs alter column goal set default 25;

-- Optional backfill for programs that never had a goal set:
-- update programs set goal = 25 where coalesce(goal, 0) = 0;
