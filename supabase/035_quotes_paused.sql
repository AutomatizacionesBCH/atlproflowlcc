-- ============================================================
-- 035 — Interruptor de emergencia para pausar las cotizaciones
-- ============================================================
-- La tasa ahora es automática (dólar observado + referencia de mercado). Si una fuente falla o da un valor raro,
-- un administrador puede pausar las cotizaciones desde /admin/tasa.
alter table public.portal_settings add column if not exists quotes_paused boolean not null default false;
