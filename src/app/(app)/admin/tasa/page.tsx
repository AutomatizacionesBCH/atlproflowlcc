import { requireAdmin } from '@/lib/portal/admin'
import { getSettings } from '@/lib/portal/server'
import { getMarketRate } from '@/lib/portal/fx'
import { PauseSwitch } from '@/components/admin/PauseSwitch'
import { quoteFromUsd } from '@/lib/pricing'
import { formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tasa | Administración' }

export default async function AdminTasa() {
  await requireAdmin()
  const [settings, market] = await Promise.all([getSettings(), getMarketRate()])
  const blocked = settings.quotes_paused || !market || market.disagreement
  const status = settings.quotes_paused
    ? { text: 'Pausadas manualmente', tone: 'bg-red-50 text-danger' }
    : !market ? { text: 'Sin fuente: los clientes no pueden cotizar', tone: 'bg-red-50 text-danger' }
    : market.disagreement ? { text: 'Fuentes contradictorias: los clientes no pueden cotizar', tone: 'bg-red-50 text-danger' }
    : { text: 'Cotizando', tone: 'bg-brand-muted text-brand' }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6 lg:p-10">
      <div>
        <h1 className="text-2xl font-semibold">Tasa de cambio</h1>
        <p className="mt-1 text-sm text-ink-soft">La tasa es automática: se usa el menor valor entre las fuentes disponibles. No hay que publicar nada.</p>
      </div>

      <section aria-label="Tasa vigente" className="rounded-2xl border border-line bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-4xl font-semibold">{market ? market.rate.toLocaleString('es-CL', { minimumFractionDigits: 2 }) : '—'}</p>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>{status.text}</span>
        </div>

        {market && (
          <ul className="mt-4 divide-y divide-line-subtle text-sm">
            {market.sources.map(s => (
              <li key={s.name} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-ink-soft">{s.name}</span>
                <span className="font-mono">{s.value.toLocaleString('es-CL', { minimumFractionDigits: 2 })} <span className="font-sans text-xs text-ink-faint">· {formatDateTime(s.asOf).slice(0, 10)}</span></span>
              </li>
            ))}
          </ul>
        )}

        {market && !blocked && (
          <table className="mt-5 w-full text-sm">
            <caption className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-ink-soft">Lo que recibe el cliente por 1 USD</caption>
            <tbody>
              {[500, 1000, 2500, 5000].map(usd => {
                const q = quoteFromUsd(usd, market.rate)
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
        )}
        {market?.disagreement && (
          <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-warning">
            Las fuentes difieren más de un 3 %. Por seguridad no se cotiza hasta que coincidan; revisa los valores o pausa manualmente.
          </p>
        )}
        <p className="mt-4 text-xs text-ink-faint">Los datos se refrescan cada 2 minutos. Cada cotización guarda la tasa que usó.</p>
      </section>

      <section aria-label="Interruptor de emergencia" className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Interruptor de emergencia</h2>
        <p className="mb-4 mt-2 text-sm text-ink-soft">Si ves un valor raro, pausa las cotizaciones. Las operaciones ya confirmadas no se afectan.</p>
        <PauseSwitch paused={settings.quotes_paused} />
      </section>

      <p className="text-xs text-ink-faint">
        Límites: mín. USD {settings.min_usd} · máx. USD {settings.max_usd_per_operation.toLocaleString('es-CL')} por operación · cotización válida {Math.round(settings.quote_ttl_seconds / 60)} min.
      </p>
    </div>
  )
}
