import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/portal/admin'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatusActions } from '@/components/admin/StatusActions'
import { formatCLP, formatDateTime, formatUSD } from '@/lib/utils'
import { formatRutForDisplay } from '@/lib/rut'
import { ACCOUNT_TYPES, STATUS_LABEL, type RequestStatus } from '@/lib/status'

export const dynamic = 'force-dynamic'
const UUID = /^[0-9a-f-]{36}$/i

const KYC: Record<string, string> = {
  sin_verificar: 'Sin verificar', en_proceso: 'En proceso', en_revision: 'En revisión manual', aprobado: 'Verificada', rechazado: 'Rechazada',
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="flex justify-between gap-4 py-2 text-sm"><dt className="text-ink-soft">{k}</dt><dd className="text-right">{children}</dd></div>
}

export default async function DetalleSolicitud({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const { admin } = await requireAdmin()

  const { data: r } = await admin.from('operation_requests').select('*').eq('id', id).maybeSingle()
  if (!r) notFound()
  const [{ data: profile }, { data: events }, { data: lastKyc }] = await Promise.all([
    r.customer_id ? admin.from('customer_profiles').select('kyc_status, full_name, rut, email').eq('id', r.customer_id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from('request_events').select('id, actor, from_status, to_status, note, created_at').eq('request_id', id).order('created_at', { ascending: false }),
    r.customer_id ? admin.from('kyc_verifications').select('provider').eq('customer_id', r.customer_id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const status = r.status as RequestStatus
  const accountType = ACCOUNT_TYPES.find(t => t.value === r.transfer_account_type)?.label ?? r.transfer_account_type
  const kycOk = profile?.kyc_status === 'aprobado'

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-10">
      <Link href="/admin/solicitudes" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Solicitudes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">A transferir al cliente</p>
          <p className="font-mono text-4xl font-semibold">{r.quoted_clp ? formatCLP(Number(r.quoted_clp)) : '—'}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {lastKyc?.provider === 'prueba-admin' && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-warning">
          <strong>Modo pruebas:</strong> la identidad de esta cuenta fue marcada manualmente por un administrador, no verificada por el proveedor. No transfieras dinero.
        </p>
      )}

      {!kycOk && r.source === 'portal' && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-warning">
          La identidad de este cliente no figura como verificada ({KYC[profile?.kyc_status ?? 'sin_verificar']}). No transfieras hasta revisarla.
        </p>
      )}

      <section aria-label="Cliente" className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Cliente</h2>
        <dl className="mt-2 divide-y divide-line-subtle">
          <Row k="Nombre">{r.full_name ?? '—'}</Row>
          <Row k="RUT"><span className="font-mono">{r.document_id ? formatRutForDisplay(r.document_id) : '—'}</span></Row>
          <Row k="Correo">{r.email}</Row>
          {r.source === 'portal' && <Row k="Identidad">{KYC[profile?.kyc_status ?? 'sin_verificar']}</Row>}
          <Row k="Origen">{r.source === 'portal' ? 'Portal de clientes' : 'Formulario de documentos'}</Row>
        </dl>
      </section>

      <section aria-label="Operación" className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Operación</h2>
        <dl className="mt-2 divide-y divide-line-subtle">
          <Row k="Monto en cupo"><span className="font-mono">{formatUSD(Number(r.amount_usd))}</span></Row>
          {r.quoted_fx && <Row k="Tasa base"><span className="font-mono">{Number(r.quoted_fx).toLocaleString('es-CL')}</span></Row>}
          {r.quoted_payout_pct && <Row k="Payout al cliente"><span className="font-mono">{Number(r.quoted_payout_pct)}%</span></Row>}
          <Row k="Confirmada">{r.confirmed_at ? formatDateTime(r.confirmed_at) : '—'}</Row>
        </dl>
      </section>

      <section aria-label="Cuenta de destino" className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Cuenta de destino</h2>
        <dl className="mt-2 divide-y divide-line-subtle">
          <Row k="Banco">{r.transfer_bank_name ?? '—'}</Row>
          <Row k="Tipo">{accountType ?? '—'}</Row>
          <Row k="Número"><span className="font-mono">{r.transfer_account_number ?? '—'}</span></Row>
          <Row k="Titular">{r.full_name ?? '—'}{r.document_id ? ` · ${formatRutForDisplay(r.document_id)}` : ''}</Row>
        </dl>
        <p className="mt-3 text-xs text-ink-faint">Transfiere solo si el titular de la cuenta coincide con el nombre y RUT del cliente.</p>
      </section>

      <section aria-label="Acciones" className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-soft">Acciones</h2>
        <StatusActions id={r.id} status={status} />
      </section>

      <section aria-label="Historial">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-soft">Historial</h2>
        {(events ?? []).length === 0 ? <p className="text-sm text-ink-faint">Sin movimientos todavía.</p> : (
          <ul className="divide-y divide-line-subtle rounded-2xl border border-line bg-white">
            {events!.map(e => (
              <li key={e.id} className="px-5 py-3 text-sm">
                <p>{STATUS_LABEL[e.from_status as RequestStatus]?.label} → <strong>{STATUS_LABEL[e.to_status as RequestStatus]?.label}</strong></p>
                <p className="text-xs text-ink-faint">{formatDateTime(e.created_at)} · {e.actor}{e.note ? ` · ${e.note}` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
