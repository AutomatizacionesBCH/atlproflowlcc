-- ============================================================
-- 034 — Bitácora de cambios de estado de las solicitudes
-- ============================================================
-- Cada cambio de estado hecho por el equipo queda registrado (quién, cuándo, de qué a qué y por qué).
create table if not exists public.request_events (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.operation_requests(id) on delete cascade,
  actor       text not null,
  from_status text not null,
  to_status   text not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists request_events_request_idx on public.request_events (request_id, created_at desc);
alter table public.request_events enable row level security;  -- sin policies: solo service_role
