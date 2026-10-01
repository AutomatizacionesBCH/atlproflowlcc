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
