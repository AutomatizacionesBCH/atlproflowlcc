import Link from 'next/link'
import { Clock } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { PublicShell } from '@/components/layout/PublicShell'
import { ExchangeForm } from '@/components/exchange/ExchangeForm'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getCurrentFx, getSettings } from '@/lib/portal/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCLP, formatUSD } from '@/lib/utils'
import type { RequestStatus } from '@/lib/status'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'La Caja Chica | Cambia tu cupo en dólares' }

export default async function Home() {
  const { data: { user } } = await (await createClient()).auth.getUser()
  const settings = await getSettings()
  const fx = await getCurrentFx(settings)

  // Operaciones en curso del cliente (el módulo "Nueva operación" es donde avanza el proceso).
  const inProgress = user
    ? (await createAdminClient().from('operation_requests')
        .select('id, amount_usd, quoted_clp, status, quote_expires_at')
        .eq('customer_id', user.id).in('status', ['cotizada', 'pendiente', 'revisado'])
        .order('created_at', { ascending: false }).limit(10)).data ?? []
    : []
  const nowMs = new Date().getTime()
  const open = inProgress.filter(r => r.status !== 'cotizada' || (r.quote_expires_at && new Date(r.quote_expires_at).getTime() > nowMs))

  const content = (
    <div className="mx-auto max-w-md space-y-6 p-4 pt-6 lg:pt-16">
      {open.length > 0 && (
        <section aria-label="Operaciones en curso" className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Operaciones en curso</h2>
          {open.map(r => (
            <Link key={r.id} href={`/operacion/${r.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 hover:border-brand">
              <div>
                <p className="font-mono font-medium">{formatCLP(Number(r.quoted_clp ?? 0))}</p>
                <p className="font-mono text-xs text-ink-faint">{formatUSD(Number(r.amount_usd))}</p>
              </div>
              <StatusBadge status={r.status as RequestStatus} />
            </Link>
          ))}
        </section>
      )}

      {fx ? (
        <ExchangeForm fx={fx} minUsd={settings.min_usd} maxUsd={settings.max_usd_per_operation} authed={!!user} />
      ) : (
        <div role="status" className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
          <Clock className="mx-auto size-10 text-brand" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold">Cotización no disponible</h1>
          <p className="mt-2 text-sm text-ink-soft">Estamos actualizando la tasa. Vuelve a intentarlo en unos minutos.</p>
        </div>
      )}
    </div>
  )

  return user ? <AppShell email={user.email ?? ''}>{content}</AppShell> : <PublicShell>{content}</PublicShell>
}
