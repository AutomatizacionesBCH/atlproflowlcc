import Link from 'next/link'
import { requireAdmin } from '@/lib/portal/admin'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCLP, formatDateTime, formatUSD } from '@/lib/utils'
import { STATUS_LABEL, type RequestStatus } from '@/lib/status'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Solicitudes | Administración' }

const TABS: RequestStatus[] = ['pendiente', 'revisado', 'convertido', 'descartado']

export default async function Solicitudes({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { admin } = await requireAdmin()
  const { estado } = await searchParams
  const current: RequestStatus = TABS.includes(estado as RequestStatus) ? (estado as RequestStatus) : 'pendiente'

  const [{ data: all }, { data: rows }] = await Promise.all([
    admin.from('operation_requests').select('status').neq('status', 'cotizada').limit(5000),
    admin.from('operation_requests')
      .select('id, full_name, email, amount_usd, quoted_clp, transfer_bank_name, source, status, confirmed_at, created_at')
      .eq('status', current).order('created_at', { ascending: false }).limit(100),
  ])
  const counts = Object.fromEntries(TABS.map(t => [t, (all ?? []).filter(r => r.status === t).length]))

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-10">
      <div>
        <h1 className="text-2xl font-semibold">Solicitudes</h1>
        <p className="mt-1 text-sm text-ink-soft">Operaciones confirmadas por los clientes.</p>
      </div>

      <nav aria-label="Estado" className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <Link key={t} href={`/admin/solicitudes?estado=${t}`} aria-current={t === current ? 'page' : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${t === current ? 'border-brand bg-brand text-white' : 'border-line-strong text-ink-soft hover:border-brand'}`}>
            {STATUS_LABEL[t].label} <span className="ml-1 opacity-70">{counts[t]}</span>
          </Link>
        ))}
      </nav>

      {(rows ?? []).length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-10 text-center text-ink-soft">No hay solicitudes en este estado.</p>
      ) : (
        <ul className="space-y-3">
          {rows!.map(r => (
            <li key={r.id}>
              <Link href={`/admin/solicitudes/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 hover:border-brand">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.full_name ?? r.email}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {formatDateTime(r.confirmed_at ?? r.created_at)} · {r.transfer_bank_name ?? 'Sin cuenta'} · {r.source === 'portal' ? 'Portal' : 'Formulario'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono">{r.quoted_clp ? formatCLP(Number(r.quoted_clp)) : '—'}</p>
                  <p className="font-mono text-xs text-ink-faint">{formatUSD(Number(r.amount_usd))}</p>
                </div>
                <StatusBadge status={r.status as RequestStatus} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
