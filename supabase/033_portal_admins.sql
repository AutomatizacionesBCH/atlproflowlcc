-- ============================================================
-- 033 — Administradores del portal y autoría de las tasas
-- ============================================================
-- Admin = email dentro de portal_admins (el email se verifica con el código OTP, así que no se puede suplantar).
-- Agregar el primer administrador (cambia el correo):
--   insert into public.portal_admins (email) values ('tu@correo.cl');
-- ============================================================

create table if not exists public.portal_admins (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.portal_admins enable row level security;  -- sin policies: solo service_role

alter table public.fx_rates add column if not exists created_by text;
