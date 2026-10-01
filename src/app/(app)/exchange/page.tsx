import { Clock } from 'lucide-react'
import { ExchangeForm } from '@/components/exchange/ExchangeForm'
import { getCurrentFx, getSettings, requireCustomer } from '@/lib/portal/server'

export const dynamic = 'force-dynamic'

export default async function NuevaOperacion() {
  await requireCustomer()
  const settings = await getSettings()
  const fx = await getCurrentFx(settings)

  return (
    <div className="mx-auto max-w-md p-4 pt-10 lg:pt-16">
      {fx ? (
        <ExchangeForm fx={fx} minUsd={settings.min_usd} maxUsd={settings.max_usd_per_operation} />
      ) : (
        <div role="status" className="rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
          <Clock className="mx-auto size-10 text-brand" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold">Cotización no disponible</h1>
          <p className="mt-2 text-sm text-ink-soft">Estamos actualizando la tasa. Vuelve a intentarlo en unos minutos.</p>
        </div>
      )}
    </div>
  )
}
