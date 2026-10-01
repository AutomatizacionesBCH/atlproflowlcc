import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireCustomer } from '@/lib/portal/server'
import { PrintButton } from '@/components/operaciones/PrintButton'
import { formatCLP, formatDateTime, formatUSD } from '@/lib/utils'
import { formatRutForDisplay } from '@/lib/rut'
import { ACCOUNT_TYPES } from '@/lib/status'

export const dynamic = 'force-dynamic'
const UUID = /^[0-9a-f-]{36}$/i

export default async function Comprobante({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const { user, admin } = await requireCustomer()
  const { data: r } = await admin.from('operation_requests').select('*').eq('id', id).eq('customer_id', user.id).maybeSingle()
  // El comprobante solo existe cuando la operación fue completada por el equipo.
  if (!r || r.status !== 'convertido') notFound()

  const type = ACCOUNT_TYPES.find(t => t.value === r.transfer_account_type)?.label
  const rows: [string, string][] = [
    ['Cliente', r.full_name ?? ''],
    ['RUT', r.document_id ? formatRutForDisplay(r.document_id) : ''],
    ['Fecha de la solicitud', formatDateTime(r.confirmed_at ?? r.created_at)],
    ['Monto cambiado (cupo)', formatUSD(Number(r.amount_usd))],
    ['Tasa efectiva', `1 USD = ${(Number(r.quoted_fx) * Number(r.quoted_payout_pct) / 100).toLocaleString('es-CL', { maximumFractionDigits: 2 })} CLP`],
    ['Cuenta de destino', `${r.transfer_bank_name} · ${type ?? ''} ··${String(r.transfer_account_number).slice(-4)}`],
  ]

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 sm:p-6 lg:pt-12">
      <Link href={`/operaciones/${id}`} className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink print:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Volver
      </Link>

      <article className="rounded-2xl border border-line bg-white p-8 print:border-0 print:p-0">
        <header className="flex items-center justify-between border-b border-line-subtle pb-5">
          <Image src="/brand/logo.png" alt="La Caja Chica" width={130} height={31} style={{ width: 130, height: 'auto' }} />
          <p className="rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand">OPERACIÓN COMPLETADA</p>
        </header>

        <p className="mt-6 text-xs font-medium uppercase tracking-wider text-ink-soft">Monto transferido a tu cuenta</p>
        <p className="font-mono text-4xl font-semibold">{formatCLP(Number(r.quoted_clp))}</p>

        <dl className="mt-6 divide-y divide-line-subtle text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-ink-soft">{k}</dt><dd className="text-right">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-6 font-mono text-xs text-ink-faint">N.º de operación: {r.id}</p>
      </article>

      <PrintButton />
    </div>
  )
}
