-- ─────────────────────────────────────────────────────────────
-- ACCOUNT DI TEST: abbonamenti marcati come test non vengono
-- conteggiati nei ricavi della Panoramica admin
-- ─────────────────────────────────────────────────────────────
alter table public.subscriptions
  add column if not exists is_test boolean not null default false;
