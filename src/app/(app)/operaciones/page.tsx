import Link from 'next/link'
import { ArrowLeftRight } from 'lucide-react'
import { requireCustomer } from '@/lib/portal/server'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCLP, formatDateTime, formatUSD } from '@/lib/utils'
import type { RequestStatus } from '@/lib/status'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mis operaciones | La Caja Chica' }

export default async function MisOperaciones() {
  const { user, admin } = await requireCustomer()
  const { data } = await admin
    .from('operation_requests')
    .select('id, amount_usd, quoted_clp, status, created_at')
    .eq('customer_id', user.id)
    .in('status', ['convertido', 'descartado'])
    .order('created_at', { ascending: false })
    .limit(100)
  const rows = data ?? []

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-10">
      <h1 className="text-2xl font-semibold">Mis operaciones</h1>
      <p className="mt-1 text-sm text-ink-soft">Aquí quedan guardadas tus operaciones finalizadas.</p>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-white p-10 text-center">
          <p className="text-ink-soft">Aún no tienes operaciones finalizadas.</p>
          <Link href="/" className="mt-4 inline-flex h-12 items-center gap-2 rounded-lg bg-brand px-6 font-medium text-white hover:bg-brand-hover">
            <ArrowLeftRight className="size-4" aria-hidden /> Nueva operación
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map(r => {
            return (
              <li key={r.id}>
                <Link href={`/operaciones/${r.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 transition-colors hover:border-brand">
                  <div className="min-w-0">
                    <p className="font-mono text-lg font-medium">{formatCLP(Number(r.quoted_clp ?? 0))}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {formatUSD(Number(r.amount_usd))} · {formatDateTime(r.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={r.status as RequestStatus} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
