import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireCustomer } from '@/lib/portal/server'
import { ConfirmPanel } from '@/components/operaciones/ConfirmPanel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCLP, formatDateTime, formatUSD, isPast } from '@/lib/utils'
import { formatRutForDisplay } from '@/lib/rut'
import type { RequestStatus } from '@/lib/status'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f-]{36}$/i

export default async function DetalleOperacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const { user, admin } = await requireCustomer()

  const [{ data: r }, { data: profile }, { data: accounts }] = await Promise.all([
    admin.from('operation_requests').select('*').eq('id', id).eq('customer_id', user.id).maybeSingle(),
    admin.from('customer_profiles').select('kyc_status, full_name, rut').eq('id', user.id).single(),
    admin.from('customer_bank_accounts').select('bank_name, account_type, account_number').eq('customer_id', user.id).order('created_at', { ascending: false }),
  ])
  if (!r) notFound()

  const status = r.status as RequestStatus
  const expired = status === 'cotizada' && isPast(r.quote_expires_at)

  return (
    <div className="mx-auto max-w-md space-y-6 p-4 sm:p-6 lg:pt-12">
      <Link href="/operaciones" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Mis operaciones
      </Link>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">Recibirás</p>
          <StatusBadge status={status} expired={expired} />
        </div>
        <p className="mt-2 font-mono text-4xl font-semibold">{formatCLP(Number(r.quoted_clp))}</p>
        <dl className="mt-6 space-y-3 border-t border-line-subtle pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">Pagas con tu cupo</dt><dd className="font-mono">{formatUSD(Number(r.amount_usd))}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">Tasa efectiva</dt><dd className="font-mono">1 USD = {(Number(r.quoted_fx) * Number(r.quoted_payout_pct) / 100).toLocaleString('es-CL', { maximumFractionDigits: 2 })} CLP</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">Fecha</dt><dd>{formatDateTime(r.created_at)}</dd></div>
          {r.transfer_bank_name && (
            <div className="flex justify-between"><dt className="text-ink-soft">Cuenta destino</dt><dd>{r.transfer_bank_name} ··{String(r.transfer_account_number).slice(-4)}</dd></div>
          )}
        </dl>
      </div>

      {status === 'cotizada' && r.quote_expires_at && (
        <ConfirmPanel
          id={r.id}
          expiresAt={r.quote_expires_at}
          kycApproved={profile?.kyc_status === 'aprobado'}
          holderName={profile?.full_name ?? null}
          holderRut={profile?.rut ? formatRutForDisplay(profile.rut) : null}
          saved={accounts ?? []}
        />
      )}
      {status === 'pendiente' && (
        <p className="rounded-2xl bg-brand-muted p-5 text-sm text-brand">
          Recibimos tu solicitud. Nuestro equipo la está revisando y te avisaremos por correo cuando esté lista.
        </p>
      )}
    </div>
  )
}
