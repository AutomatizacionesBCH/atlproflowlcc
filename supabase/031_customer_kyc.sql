-- ============================================================
-- 031 — Portal de clientes (ATL-Proflow): perfiles y KYC
-- ============================================================
-- REVISAR ANTES DE APLICAR (mismo proyecto Supabase que ProFlow OS):
--   1. Abrir el registro público (OTP por email) permite que CUALQUIERA cree un
--      usuario en auth.users. El trigger handle_new_user de la migración 026 lee
--      `role` desde raw_user_meta_data (editable por quien se registra) y crea un
--      perfil 'operador' por defecto  → un cliente podría obtener rol de equipo.
--   2. El proxy de ProFlow usa `profile?.role ?? 'operador'`: un usuario SIN fila en
--      `profiles` entra como operador. Con registro público eso debe ser "sin acceso".
--   Por eso esta migración reemplaza el trigger: ya no confía en metadata del usuario
--   y NO crea perfiles de equipo automáticamente. Los usuarios del equipo pasan a
--   crearse con INSERT manual en `profiles` (ver 026) y hay que cambiar el fallback
--   del proxy de ProFlow a "sin acceso".
-- ============================================================

create table if not exists public.customer_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  rut         text unique,
  phone       text,
  kyc_status  text not null default 'sin_verificar'
    check (kyc_status in ('sin_verificar','en_proceso','en_revision','aprobado','rechazado')),
  client_id   text,  -- clients.id una vez convertido en cliente operativo
  created_at  timestamptz not null default now()
);

create table if not exists public.kyc_verifications (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid not null references public.customer_profiles(id) on delete cascade,
  provider           text not null default 'didit',
  status             text not null default 'en_proceso'
    check (status in ('en_proceso','aprobado','en_revision','rechazado')),
  reasons            text[] not null default '{}',
  didit_request_ids  jsonb,
  face_match_score   numeric,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists kyc_verifications_customer_idx on public.kyc_verifications (customer_id, created_at desc);

alter table public.customer_profiles enable row level security;
alter table public.kyc_verifications enable row level security;

-- El cliente solo LEE lo suyo. Toda escritura (rut, kyc_status, resultados) es service_role.
create policy "customer reads own profile" on public.customer_profiles
  for select using (auth.uid() = id);
create policy "customer reads own kyc" on public.kyc_verifications
  for select using (auth.uid() = customer_id);

-- Trigger endurecido: todo usuario nuevo es un cliente; los roles de equipo NUNCA salen de metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.customer_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Idempotente: en el Supabase compartido reemplaza el trigger de la 026; en uno nuevo lo crea.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
