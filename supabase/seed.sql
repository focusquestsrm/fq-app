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

insert into config_items (kind, value, sort) values
  ('category','Allied Health',0), ('category','Technology',1),
  ('category','Skilled Trades',2), ('category','Supportive Service',3)
on conflict do nothing;

insert into config_items (kind, value, sort) values
  ('funding','Workforce',0), ('funding','ETPL',1), ('funding','Cash',2)
on conflict do nothing;

-- providers (each with its own revenue split: provider / school / FQ). More
-- register automatically as you add programs; edit splits on the Settings page.
insert into providers (name, provider_share, school_share, fq_share, sort) values
  ('MedCerts', 0.40, 0.40, 0.20, 0),
  ('General Assembly', 0.40, 0.40, 0.20, 1),
  ('Quantum Power', 0.40, 0.40, 0.20, 2),
  ('Skill Up', 0.40, 0.40, 0.20, 3),
  ('FocusQuest', 0.40, 0.40, 0.20, 4)
on conflict (name) do nothing;
