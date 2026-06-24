-- ============================================================================
-- MIGRATION — Users & Permissions module
-- Run this in the Supabase SQL editor on a database that already has schema.sql.
-- It is idempotent (safe to run more than once).
--
-- ⚠️  Postgres won't let a brand-new enum value be USED in the same transaction
--     it was added. If you run the whole file at once and get an error like
--     "unsafe use of new value 'fqviewer'", just run STEP 1 by itself first,
--     then run STEP 2. (Re-running is safe.)
-- ============================================================================

-- ---- STEP 1: add the new FQ Viewer role to the enum ------------------------
alter type user_role add value if not exists 'fqviewer';

-- ---- STEP 2: helpers + policies -------------------------------------------
-- FQ Viewer is FocusQuest-wide and read-only, so it counts as "FQ" for reads.
create or replace function app_is_fq() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('superadmin','accountmgr','finance','fqviewer'), false)
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

-- Broaden the profiles update policy: a School Admin may edit their own school's
-- school-level users; the new row must stay inside that school (no FQ access,
-- no other school). FQ admins can edit anyone; everyone can edit themselves.
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
