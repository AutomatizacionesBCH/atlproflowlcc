@AGENTS.md

# ATL-Proflow — Portal de clientes de La Caja Chica

Portal donde **cada cliente crea su propia cuenta**, verifica su identidad, **cotiza por sí mismo** y mantiene su **historial de operaciones**. Es la versión "autoservicio" de ProFlow OS (la consola interna del equipo). El mecanismo está inspirado en app.atlascash.net (competidor con modelo parecido), con nuestras reglas de negocio, marca y colores.

- Marca: **La Caja Chica** (logo en `public/brand/`).
- Idioma de la interfaz: español (Chile). Moneda: CLP y USD.
- Relación con ProFlow OS: **mismo proyecto Supabase, misma base de datos** (regla de ProFlow: una sola versión viva, una sola BD). ATL-Proflow es una app aparte (como `docslcc/`) que lee/escribe las tablas compartidas; el equipo sigue operando desde ProFlow OS.

## Cómo opera el modelo (extraído de AtlasCash)

1. **Acceso solo con email.** El cliente ingresa su email; si no existe se crea la cuenta, si existe se inicia sesión (una sola pantalla: "Accede o crea tu cuenta en segundos"). Sin contraseña: código OTP de 6 dígitos por correo.
2. **Cotizador autoservicio** (`/exchange`, "Nueva operación"): el cliente escribe CLP a recibir **o** USD a pagar; el otro campo se calcula con la tasa del momento. "Continuar" deshabilitado hasta que haya monto. Se muestra la tasa antes de confirmar.
3. **Verificación de identidad (KYC) obligatoria antes de la primera operación.** Cédula/pasaporte + prueba de vida biométrica, hecha por un proveedor externo (AtlasCash usa Didit). **Una sola cuenta por RUT.**
4. **Datos de pago:** cuenta bancaria del cliente (siempre del titular, nunca de terceros) y tarjeta(s) a operar.
5. **Confirmación y desembolso:** el cliente acepta la tasa, el equipo ejecuta y transfiere; el cliente ve el estado.
6. **Historial** ("Mis operaciones") con estado y comprobante de cada operación.

Navegación del cliente (sidebar): **Nueva operación · Mis operaciones · Ajustes** (+ cerrar sesión). Nada más.

## Login — diseño

**Supabase Auth con email OTP** (`supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` y `verifyOtp({ email, token, type: 'email' })`). Sin contraseñas ni NextAuth.

- Plantilla de correo de Supabase configurada para enviar el **código de 6 dígitos** (`{{ .Token }}`), no solo el link. Asunto tipo "123456 es tu código".
- Pantalla 1: campo email + "Continuar". Pantalla 2: input de código de 6 dígitos (autofocus, `autocomplete="one-time-code"`, reenviar con cooldown de 60 s).
- Rate limit de OTP en Supabase (Auth → Rate limits) y captcha (Turnstile/hCaptcha) en el formulario de email para evitar abuso.
- Sesión por cookies vía `@supabase/ssr`. Protección de rutas en `proxy.ts` (Next 16 renombró `middleware.ts`): sin sesión → `/login`; sesión sin KYC aprobado → puede cotizar pero **no confirmar** operaciones (se le lleva a `/verificacion`).
- **Separación de roles:** los clientes usan esta app; el equipo (administrador/operador) sigue en ProFlow OS con `profiles.role`. Los clientes NO deben tener fila en `profiles` con rol de equipo: usar tabla propia `customer_profiles`, y el trigger `handle_new_user` de ProFlow (migración 026) debe distinguir/ignorar a los clientes para no darles rol `operador` por defecto. **Revisar ese trigger antes de habilitar registro público.**

## Verificación de identidad (KYC) — diseño

Proveedor propuesto: **Didit** (hosted sessions; es el que usa AtlasCash). Alternativa: verificación manual con los documentos que ya recolecta `docslcc`. Decidir antes de implementar.

Flujo con Didit (API verificada en docs.didit.me, revisar la versión vigente al implementar):
1. Server Action/Route Handler crea la sesión: `POST https://verification.didit.me/v3/session/` con header `x-api-key` (**solo desde backend**), body `{ workflow_id, vendor_data: <customer_id>, callback: <url de retorno>, contact_details: { email }, language: 'es' }`. Con `vendor_data` estable, Didit devuelve la sesión existente si hay una sin terminar y permite detectar duplicados.
2. Se guarda `session_id` + estado `Not Started` en `kyc_verifications` y se redirige al cliente a la `url` de la respuesta (verificación alojada por Didit).
3. **Webhook** `POST /api/webhooks/didit` (evento `status.updated`): leer el **body crudo**, verificar `X-Signature-V2` (HMAC-SHA256 con el shared secret), rechazar si `abs(now - X-Timestamp) > 300 s`, comparar con `timingSafeEqual`, procesar de forma **idempotente por `event_id`**, responder 2xx de inmediato. Estados: `Approved` / `Declined` / en revisión.
4. La aprobación **nunca** se decide desde el navegador: solo el webhook (o un `GET` a la sesión desde el servidor) cambia `kyc_status`. La página de retorno solo consulta el estado.
5. Antes de redirigir, mostrar **consentimiento y aviso de privacidad** propios (Didit indica que el consentimiento se maneja en nuestro UX). Registrar fecha/versión aceptada.
6. **Un RUT = una cuenta:** tras `Approved`, extraer el RUT del documento, normalizarlo (`formatRutForStorage`) y guardarlo con restricción `UNIQUE`. Si ya existe en otra cuenta → marcar `en_revision` y avisar al equipo; no aprobar automáticamente.
7. Verificar que el **nombre del documento coincide con el titular de la cuenta bancaria** declarada (regla de negocio: transferencias solo al titular).
8. Reverificación: si el equipo marca riesgo (`tag riesgo`) o cambian la cuenta bancaria, se exige nueva verificación.

Datos sensibles (cédula, selfies, tarjetas): **no guardarlos en nuestra BD**. Guardar solo `session_id`, estado, RUT normalizado y nombre. Lo demás vive en Didit; si se suben archivos propios, bucket **privado** con URLs firmadas (como `documentos-solicitudes`).

## Reglas de negocio (propias — heredadas de ProFlow OS)

Fuente: `../PROJECT_RULES.md` y `../src/lib/utils.ts`. Si difieren, manda ProFlow OS.

- **Tipo de cambio:** hoy es de ingreso manual y se usa el **menor entre dólar observado y Bloomberg**. El cotizador del cliente debe leer una tasa publicada por el equipo (tabla `fx_rates`, con vigencia), **nunca** calcularla en el navegador.
- **Payout al cliente (% del bruto):** < USD 1.000 → 78 % · 1.000–2.499 → 79 % · 2.500–4.999 → 80 % · ≥ 5.000 → 81 % (`suggestPayoutPct`). El cliente ve solo lo que recibe ("tasa efectiva", "sin comisión oculta"), **nunca** los fees internos ni la utilidad.
- **Cálculo:** `gross_clp = usd × fx`, `clp_a_pagar = gross_clp × payout%` (`calcOperation`). Reutilizar esa función, no duplicarla.
- **Límite por operación:** definir (AtlasCash usa USD 3.000 y permite varias operaciones). Configurable en BD, no hardcodeado.
- **Vigencia de la cotización:** la tasa mostrada se congela por N minutos al confirmar; si expira, se recotiza. Guardar `fx_rate_used` y `payout_pct` en la operación.
- **Transferencias solo a cuentas del titular verificado.** Se permiten varias tarjetas (bancos y billeteras) por solicitud.
- Toda operación vincula **cliente + empresa + procesador** (asignados por el equipo en ProFlow OS, no por el cliente). La operación del portal nace como **solicitud** (`status: pendiente`) y el equipo la convierte en operación real.
- Fórmula de utilidad (solo interna): `gross_clp − processor_fee − loan_fee − payout_fee − wire_fee − receive_fee − client_payout = profit_clp`.
- Estados de operación: `pendiente · en_proceso · completada · anulada`. El cliente ve etiquetas legibles ("En revisión", "En proceso", "Completada", "Anulada"), nunca el enum crudo.
- RUT: guardar sin puntos (`17590573-1`), mostrar con puntos; `validateRut` al registrarse.
- **Operaciones finales:** sin reembolso salvo falla técnica nuestra. Definir política de cancelación (solo si está `pendiente`) y redactarla con abogado antes de publicar.
- **Cumplimiento (AML/UAF):** KYC antes de la primera operación, monitoreo y reporte de operaciones sospechosas. Validar con asesoría legal los términos, la política de privacidad (Ley 19.628 / 21.719) y la postura regulatoria; **no copiar** los textos de AtlasCash.

## Modelo de datos (propuesta — mismo Supabase que ProFlow OS)

Migraciones nuevas numeradas a continuación de `../supabase/` (última: 030), prefijo de archivo `031_…`. No alterar tablas existentes de ProFlow sin avisar.

- `customer_profiles`: `id` (= `auth.users.id`), `email`, `full_name`, `rut` (UNIQUE, nullable hasta KYC), `phone`, `kyc_status` (`sin_verificar | en_proceso | en_revision | aprobado | rechazado`), `client_id` (vínculo a `clients` una vez convertido), `created_at`.
- `kyc_verifications`: `id`, `customer_id`, `provider` (`didit`), `session_id`, `status`, `last_event_id` (idempotencia), `consent_version`, `consent_at`, `created_at`, `updated_at`.
- `customer_bank_accounts`: `customer_id`, `bank_name`, `account_type`, `account_number`, `holder_rut`, `holder_name`, `verified`.
- `fx_rates`: `rate`, `source` (observado/bloomberg/manual), `valid_from`, `valid_until`, `created_by`.
- `operation_requests` (ya existe, migraciones 029/030): agregar `customer_id` y `quoted_fx`, `quoted_payout_pct`, `quote_expires_at`.
- **RLS activado siempre.** El cliente solo lee/escribe sus propias filas (`auth.uid() = customer_id`); `kyc_status`, `rut` y cualquier campo de decisión solo se modifican con `service_role` (webhook/servidor). Sin policies amplias en tablas con datos sensibles.

## Stack

Mismo que ProFlow OS, para poder reutilizar código:

- Next.js 16 App Router + Turbopack, React 19, TypeScript, Tailwind CSS 4 (`@import "tailwindcss"` + `@theme`; **sin** `tailwind.config.ts`).
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`). Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor).
- KYC: `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET` (solo servidor, nunca `NEXT_PUBLIC_`).
- Correo transaccional: Gmail SMTP con nodemailer (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) como en ProFlow, para comprobantes.
- Deploy: Docker standalone en EasyPanel (como `docslcc/`: `output: 'standalone'`, Dockerfile multi-stage Alpine).
- Antes de escribir código: leer la guía correspondiente en `node_modules/next/dist/docs/` (este Next no es el que conoces; ver `AGENTS.md`).

## Marca y diseño

Logos en `public/brand/` (copiados de ProFlow `public/cotizacion/`):
- `logo.png` — logo completo "Caja Chica" (pantalla de login, emails, comprobantes)
- `logo-icon.jpg` — ícono (verde + azul con flechas de intercambio) para sidebar/favicon
- `logo-wordmark.jpg` — solo texto
- `public/icons/` — íconos PWA (192, 512, apple-touch)

Colores (de ProFlow `globals.css` y del logo):

| Token | Valor | Uso |
|---|---|---|
| `--color-accent` | `#043D35` | Verde bosque de marca: botón primario, sidebar, texto "Caja" |
| `--color-accent-hover` | `#032B25` | Hover del primario |
| `--color-accent-muted` | `#ECFDF5` | Fondos suaves, recuadro "sin comisión oculta" |
| verde logo | `#00C16E` aprox. | Acentos/éxito (muestrear del logo antes de fijar) |
| azul logo | `#5B9BFF` aprox. | Acento secundario (muestrear del logo antes de fijar) |
| `--color-border-strong` | `#CBD5E1` | Bordes de inputs |
| `--color-border-subtle` | `#F1F5F9` | Divisores |
| texto | `#0F172A` / secundario `#94A3B8` | |
| fondo de página | `#F8FAFC`, tarjetas `#FFFFFF` | |

- **Tema claro** (a diferencia de la consola interna oscura de ProFlow): es una cara pública para clientes; debe transmitir confianza y simpleza.
- Sidebar en verde bosque `#043D35` con ítem activo destacado (en AtlasCash es verde lima; en nuestro caso usar el verde del logo `#00C16E`). Card central blanca con radio grande y sombra suave.
- **Una sola acción principal por pantalla**, botón primario deshabilitado hasta que el formulario sea válido.
- Montos: `$ 1.234.567` para CLP y `USD 1.234,56`, alineados a la derecha, en `font-mono`. Fechas `es-CL` (`dd-mm-aaaa`). RUT en mono.
- Mensajes de error y confianza en lenguaje simple ("Tu información está protegida con cifrado de extremo a extremo"). Nada de jerga técnica ni de enums crudos.
- Accesibilidad: labels asociados a cada input, foco visible, contraste AA, OTP con `inputmode="numeric"`.
- Móvil primero: la mayoría de los clientes entra desde el teléfono (la verificación con cámara también).

## Estructura propuesta

```
src/
├── app/
│   ├── login/                 # email → código OTP
│   ├── verificacion/          # inicio KYC, estado, retorno de Didit
│   ├── exchange/              # Nueva operación (cotizador)
│   ├── operaciones/           # Mis operaciones (+ [id] detalle/comprobante)
│   ├── ajustes/               # datos personales, cuenta bancaria
│   └── api/webhooks/didit/route.ts
├── components/{auth,kyc,exchange,layout,ui}/
├── lib/
│   ├── supabase/{client,server,admin}.ts
│   ├── kyc/didit.ts           # crear sesión, verificar firma, mapear estados
│   ├── pricing.ts             # reutiliza calcOperation / suggestPayoutPct de ProFlow
│   └── rut.ts                 # formatRutForStorage / Display / validateRut
├── proxy.ts
└── types/
```

## Convenciones

- Server Components para leer datos; Client Components solo para interacción. Mutaciones con Server Actions (patrón de ProFlow: devolver `{ success, error }` y `revalidatePath`).
- Toda decisión de negocio (tasa, payout, aprobar KYC, estado de la operación) se calcula y valida **en el servidor**; el cliente solo muestra.
- Cliente admin de Supabase (`service_role`) solo en módulos marcados `server-only`.
- No registrar (log) datos personales, tokens ni cuerpos de webhooks completos.
- Trabajar sobre `main`, `git pull` antes de empezar, push al terminar cada módulo (regla de ProFlow; ver también la memoria "push a main despliega").

## Estado actual

- [x] Carpeta `ATL-Proflow/` creada con logos, íconos y este `CLAUDE.md`.
- [x] Repo git propio (local; `ATL-Proflow/` ignorado en el `.gitignore` de ProFlow). Falta crear el remoto en GitHub (no hay `gh` en esta máquina).
- [x] Scaffolding Next.js 16 + Tailwind 4 + Supabase, tokens de marca, sidebar y cotizador de muestra (`/exchange`, tasa fija de demo hasta tener `fx_rates`). `npm run build` y `lint` pasan.
- [ ] Decidir proveedor KYC (Didit vs. manual).
- [ ] Login por email OTP + `proxy.ts` + `customer_profiles`.
- [ ] Flujo KYC (sesión, webhook, pantallas de estado).
- [ ] Cotizador `/exchange` con `fx_rates` y reglas de payout.
- [ ] Solicitud de operación → conversión a operación real en ProFlow OS.
- [ ] Mis operaciones + comprobante.
- [ ] Términos, privacidad y política de reembolso revisados por asesoría legal.

## Decisiones abiertas

1. ¿Didit u otro proveedor de KYC, o verificación manual inicial con los documentos de `docslcc`?
2. ¿Quién publica la tasa y con qué frecuencia? (hoy es manual en ProFlow)
3. Límite por operación y política de cancelación/reembolso.
4. ¿Cómo se entera el equipo de una nueva solicitud? (correo, panel en ProFlow, o ambos)
5. ¿Repo propio en GitHub (AutomatizacionesBCH/…) y proyecto EasyPanel nuevo?
