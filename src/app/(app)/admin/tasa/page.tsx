import { requireAdmin } from '@/lib/portal/admin'
import { getSettings } from '@/lib/portal/server'
import { fetchObservedDollar } from '@/lib/portal/observed'
import { RateForm } from '@/components/admin/RateForm'
import { quoteFromUsd } from '@/lib/pricing'
import { formatDateTime, formatCLP } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tasa | Administración' }

export default async function AdminTasa() {
  const { admin } = await requireAdmin()
  const [settings, observed, { data: rates }] = await Promise.all([
    getSettings(),
    fetchObservedDollar(),
    admin.from('fx_rates').select('id, rate, note, created_by, valid_from').order('valid_from', { ascending: false }).limit(15),
  ])
  const current = rates?.[0]
  const ageMin = current ? Math.floor((new Date().getTime() - new Date(current.valid_from).getTime()) / 60000) : null
  const stale = ageMin !== null && ageMin > settings.rate_max_age_minutes

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6 lg:p-10">
      <div>
        <h1 className="text-2xl font-semibold">Tasa de cambio</h1>
        <p className="mt-1 text-sm text-ink-soft">Lo que publiques aquí es lo que ven los clientes al cotizar.</p>
      </div>

      <section aria-label="Tasa vigente" className="rounded-2xl border border-line bg-white p-6">
        {current ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-4xl font-semibold">{formatCLP(Number(current.rate))}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stale ? 'bg-red-50 text-danger' : 'bg-brand-muted text-brand'}`}>
                {stale ? 'Vencida: los clientes no pueden cotizar' : 'Vigente'}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-faint">
              Publicada {formatDateTime(current.valid_from)}{current.created_by ? ` por ${current.created_by}` : ''}.
              Caduca a las {Math.round(settings.rate_max_age_minutes / 60)} h sin actualizar.
            </p>
            <table className="mt-5 w-full text-sm">
              <caption className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-ink-soft">Lo que recibe el cliente por 1 USD</caption>
              <tbody>
                {[500, 1000, 2500, 5000].map(usd => {
                  const q = quoteFromUsd(usd, Number(current.rate))
                  return (
                    <tr key={usd} className="border-t border-line-subtle">
                      <td className="py-2 text-ink-soft">Desde USD {usd.toLocaleString('es-CL')}</td>
                      <td className="py-2 text-right text-ink-faint">{q.payoutPct}%</td>
                      <td className="py-2 text-right font-mono">{q.effectiveRate.toLocaleString('es-CL', { maximumFractionDigits: 2 })} CLP</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-ink-soft">Aún no hay ninguna tasa publicada. Los clientes ven “Cotización no disponible”.</p>
        )}
      </section>

      <section aria-label="Publicar tasa" className="rounded-2xl border border-line bg-white p-6">
        {observed && (
          <p className="mb-4 rounded-xl bg-page p-3 text-sm text-ink-soft">
            Referencia: dólar observado <strong className="font-mono text-ink">{observed.value.toLocaleString('es-CL')}</strong> (mindicador.cl, {formatDateTime(observed.date).slice(0, 10)}).
            Es solo una sugerencia; compárala con Bloomberg.
          </p>
        )}
        <RateForm suggested={observed?.value ?? null} />
      </section>

      <section aria-label="Historial">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-soft">Últimas publicaciones</h2>
        <ul className="divide-y divide-line-subtle rounded-2xl border border-line bg-white">
          {(rates ?? []).map(r => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <span className="font-mono font-medium">{Number(r.rate).toLocaleString('es-CL', { minimumFractionDigits: 2 })}</span>
              <span className="text-xs text-ink-faint">{formatDateTime(r.valid_from)}{r.created_by ? ` · ${r.created_by}` : ''}{r.note ? ` · ${r.note}` : ''}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-ink-faint">
        Límites actuales: mín. USD {settings.min_usd} · máx. USD {settings.max_usd_per_operation.toLocaleString('es-CL')} por operación · cotización válida {Math.round(settings.quote_ttl_seconds / 60)} min.
      </p>
    </div>
  )
}
