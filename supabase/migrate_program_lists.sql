-- ============================================================================
-- MIGRATION — configurable Program "category" and "funding" lists
-- Run in the Supabase SQL editor on a database that already has schema.sql.
-- Idempotent (safe to run more than once).
-- ============================================================================

-- 1) Allow the two new config kinds.
alter table config_items drop constraint if exists config_items_kind_check;
alter table config_items add constraint config_items_kind_check
  check (kind in ('type','provider','payment','disposition','category','funding'));

-- 2) Seed sensible defaults (only if missing — config_items has no unique key).
insert into config_items (kind, value, sort)
select 'category', v, ord
from (values ('Allied Health',0),('Technology',1),('Skilled Trades',2),('Supportive Service',3)) as t(v, ord)
where not exists (select 1 from config_items c where c.kind = 'category' and c.value = t.v);

insert into config_items (kind, value, sort)
select 'funding', v, ord
from (values ('Workforce',0),('ETPL',1),('Cash',2)) as t(v, ord)
where not exists (select 1 from config_items c where c.kind = 'funding' and c.value = t.v);
