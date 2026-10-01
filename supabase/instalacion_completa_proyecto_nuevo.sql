-- ============================================================
-- ATL-Proflow — instalación completa para un proyecto Supabase NUEVO
-- (029 + 030 de ProFlow + 031 + 032). Pegar todo y pulsar Run, una sola vez.
-- NO usar en el Supabase de ProFlow OS: ahí la 029/030 ya existen y la 031 cambia el trigger de usuarios.
-- ============================================================

-- ============================================================
-- 029 — Solicitudes de operación (Documentos LCC)
-- ============================================================
-- Tabla que recibe los datos y documentos que los clientes dejan en el
-- formulario público "Documentos LCC" (app aparte, repo AutomatizacionesBCH/
-- documentoslcc) antes de operar. Por ahora vive desacoplada de `clients` /
-- `operations` — cuando se conecte con ProFlow, un flujo futuro podrá
-- convertir una solicitud aprobada en cliente + operación real.
--
-- RLS queda habilitado SIN policies para anon/authenticated: los datos
-- (RUT, cédula, tarjeta, saldos) son sensibles, así que sólo son accesibles
-- con la service_role key, usada server-side en Server Actions.
-- ============================================================

create table if not exists public.operation_requests (
  id                    uuid          default gen_random_uuid() primary key,

  full_name             text          not null,
  document_id           text          not null,
  email                 text          not null,
  address               text          not null,
  comuna                text          not null,

  bank_name             text          not null,
  account_number        text          not null,
  card_brand            text          not null
    constraint operation_requests_card_brand_check
    check (card_brand in ('Visa', 'Mastercard', 'American Express')),
  card_last4            text          not null
    constraint operation_requests_card_last4_check
    check (card_last4 ~ '^\d{4}$'),

  amount_usd            numeric(14,2) not null,

  id_document_path      text,
  card_photo_path       text,
  balance_national_path text,
  balance_intl_path     text,

  status                text          not null default 'pendiente'
    constraint operation_requests_status_check
    check (status in ('pendiente', 'revisado', 'convertido', 'descartado')),
  notes                 text,

  created_at            timestamptz   not null default now()
);

alter table public.operation_requests enable row level security;
-- Sin policies para anon/authenticated a propósito — sólo accesible via service_role.

create index if not exists operation_requests_created_idx on public.operation_requests (created_at desc);
create index if not exists operation_requests_status_idx  on public.operation_requests (status);
create index if not exists operation_requests_document_idx on public.operation_requests (document_id);

-- Bucket privado para las fotos/documentos de la solicitud.
insert into storage.buckets (id, name, public)
values ('documentos-solicitudes', 'documentos-solicitudes', false)
on conflict (id) do nothing;
-- Sin policies públicas: bucket privado, sólo accesible via service_role.

-- ============================================================
-- 030 — Solicitudes de operación: separar cuenta de transferencia
--        de la(s) tarjeta(s) a operar (permite más de una tarjeta)
-- ============================================================
-- El formulario ahora distingue explícitamente:
--   - la cuenta bancaria del titular a la que se transfiere el monto
--     acordado (nunca puede ser de un tercero)
--   - la(s) tarjeta(s) que se van a operar, que pueden ser de un banco
--     o de una billetera (Mercado Pago, MACH, Tenpo, etc.) y ahora se
--     permiten varias por solicitud
-- ============================================================

alter table public.operation_requests
  rename column bank_name to transfer_bank_name;

alter table public.operation_requests
  rename column account_number to transfer_account_number;

alter table public.operation_requests
  add column if not exists cards jsonb not null default '[]'::jsonb;

alter table public.operation_requests
  drop column if exists card_brand,
  drop column if exists card_last4,
  drop column if exists card_photo_path;

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

-- ============================================================
-- 032 — Portal de clientes: tasas publicadas, ajustes y solicitudes
-- ============================================================
-- Requiere 031. REVISAR ANTES DE APLICAR: relaja NOT NULL de operation_requests
-- (el formulario docslcc sigue funcionando, solo exige menos en BD) y agrega
-- 'cotizada' como estado.
-- ============================================================

-- Tasa publicada por el equipo (regla: el menor entre dólar observado y Bloomberg).
-- Publicar con:  insert into public.fx_rates (rate, source, note) values (905.50, 'manual', 'observado 905.5 / bloomberg 906.1');
create table if not exists public.fx_rates (
  id          uuid primary key default gen_random_uuid(),
  rate        numeric(12,4) not null check (rate > 0),
  source      text not null default 'manual' check (source in ('observado','bloomberg','manual')),
  valid_from  timestamptz not null default now(),
  valid_until timestamptz,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists fx_rates_valid_from_idx on public.fx_rates (valid_from desc);
alter table public.fx_rates enable row level security;  -- sin policies: solo service_role (el servidor)

-- Ajustes del portal (una sola fila).
create table if not exists public.portal_settings (
  id                      int primary key default 1 check (id = 1),
  min_usd                 numeric(12,2) not null default 1,
  max_usd_per_operation   numeric(12,2) not null default 3000,
  quote_ttl_seconds       int not null default 300,
  rate_max_age_minutes    int not null default 180   -- si la última tasa es más vieja, no se cotiza
);
insert into public.portal_settings (id) values (1) on conflict (id) do nothing;
alter table public.portal_settings enable row level security;

-- Cuentas bancarias del cliente (siempre a nombre del titular verificado).
create table if not exists public.customer_bank_accounts (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customer_profiles(id) on delete cascade,
  bank_name      text not null,
  account_type   text not null check (account_type in ('corriente','vista','ahorro')),
  account_number text not null check (account_number ~ '^\d{6,20}$'),
  created_at     timestamptz not null default now(),
  unique (customer_id, bank_name, account_number)
);
alter table public.customer_bank_accounts enable row level security;
create policy "customer reads own accounts" on public.customer_bank_accounts
  for select using (auth.uid() = customer_id);

-- Solicitudes: una misma tabla para docslcc y el portal.
alter table public.operation_requests
  alter column full_name drop not null,
  alter column document_id drop not null,
  alter column address drop not null,
  alter column comuna drop not null,
  alter column transfer_bank_name drop not null,
  alter column transfer_account_number drop not null;

alter table public.operation_requests
  add column if not exists customer_id         uuid references public.customer_profiles(id) on delete set null,
  add column if not exists source              text not null default 'docslcc' check (source in ('docslcc','portal')),
  add column if not exists transfer_account_type text,
  add column if not exists quoted_fx           numeric(12,4),
  add column if not exists quoted_payout_pct   numeric(5,2),
  add column if not exists quoted_clp          bigint,
  add column if not exists quote_expires_at    timestamptz,
  add column if not exists confirmed_at        timestamptz;

alter table public.operation_requests drop constraint if exists operation_requests_status_check;
alter table public.operation_requests
  add constraint operation_requests_status_check
  check (status in ('cotizada','pendiente','revisado','convertido','descartado'));

create index if not exists operation_requests_customer_idx on public.operation_requests (customer_id, created_at desc);

create policy "customer reads own requests" on public.operation_requests
  for select using (auth.uid() = customer_id);
