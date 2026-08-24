-- ─────────────────────────────────────────────────────────────
-- CAMPI AGGIUNTIVI CORSI: luogo e testo pulsante, editabili da admin
-- e mostrati nella card corso in home page
-- ─────────────────────────────────────────────────────────────
alter table public.courses
  add column if not exists luogo text,
  add column if not exists testo_pulsante text;

update public.courses set luogo = 'Studio Arcadia Lab' where luogo is null;
