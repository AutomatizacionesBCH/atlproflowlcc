import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentFx, getSettings } from '@/lib/portal/server'
import { quoteFromClp, quoteFromUsd } from '@/lib/pricing'

const MAX_OPEN_QUOTES_PER_DAY = 20

/** Crea una cotización para un cliente. La cuenta se recalcula SIEMPRE aquí con la tasa vigente. */
export async function createQuote(
  user: { id: string; email?: string | null },
  side: 'clp' | 'usd',
  amount: number,
): Promise<{ error: string } | { id: string; kycOk: boolean }> {
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Ingresa un monto válido.' }
  const admin = createAdminClient()

  const settings = await getSettings()
  const fx = await getCurrentFx(settings)
  if (!fx) return { error: 'La cotización no está disponible en este momento. Inténtalo en unos minutos.' }

  const q = side === 'usd' ? quoteFromUsd(amount, fx) : quoteFromClp(amount, fx)
  if (q.usd < settings.min_usd) return { error: `El monto mínimo es USD ${settings.min_usd}.` }
  if (q.usd > settings.max_usd_per_operation) {
    return { error: `El límite por operación es USD ${settings.max_usd_per_operation.toLocaleString('es-CL')}. Puedes hacer varias operaciones.` }
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count } = await admin.from('operation_requests').select('id', { count: 'exact', head: true })
    .eq('customer_id', user.id).eq('status', 'cotizada').gte('created_at', since)
  if ((count ?? 0) >= MAX_OPEN_QUOTES_PER_DAY) return { error: 'Tienes muchas cotizaciones abiertas. Confirma una o espera a que venzan.' }

  const { data, error } = await admin.from('operation_requests').insert({
    customer_id: user.id, source: 'portal', email: user.email,
    amount_usd: q.usd, quoted_fx: fx, quoted_payout_pct: q.payoutPct, quoted_clp: q.clp,
    quote_expires_at: new Date(Date.now() + settings.quote_ttl_seconds * 1000).toISOString(),
    status: 'cotizada',
  }).select('id').single()
  if (error || !data) return { error: 'No pudimos guardar tu cotización. Inténtalo de nuevo.' }

  const { data: profile } = await admin.from('customer_profiles').select('kyc_status').eq('id', user.id).single()
  return { id: data.id, kycOk: profile?.kyc_status === 'aprobado' }
}

export const nextStepFor = (r: { id: string; kycOk: boolean }) =>
  r.kycOk ? `/operacion/${r.id}` : `/verificacion?next=${encodeURIComponent(`/operacion/${r.id}`)}`
