-- ============================================================================
-- Seed only the configurable LISTS with sensible defaults.
-- No dummy schools / programs / students — you enter those in the app.
-- Run after schema.sql.
-- ============================================================================
insert into config_items (kind, value, sort) values
  ('type','HBCU',0), ('type','MSI',1), ('type','HSI',2)
on conflict do nothing;

insert into config_items (kind, value, sort) values
  ('payment','Cash / self-pay',0), ('payment','Loan',1), ('payment','Workforce',2),
  ('payment','ETPL',3), ('payment','Grant',4), ('payment','Employer',5), ('payment','Other',6)
on conflict do nothing;

insert into config_items (kind, value, sort) values
  ('disposition','Contacted',0), ('disposition','Interested',1), ('disposition','Enrolled',2),
  ('disposition','Needs follow-up',3), ('disposition','No response',4),
  ('disposition','Application incomplete',5), ('disposition','Funding issue',6),
  ('disposition','Invalid phone',7), ('disposition','Not interested',8), ('disposition','Dropped',9)
on conflict do nothing;

-- providers start empty — they register themselves as you add programs.
