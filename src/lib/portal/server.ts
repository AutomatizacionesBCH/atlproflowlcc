import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMarketRate } from '@/lib/portal/fx'

export type Settings = { min_usd: number; max_usd_per_operation: number; quote_ttl_seconds: number; quotes_paused: boolean }

const DEFAULT_SETTINGS: Settings = { min_usd: 1, max_usd_per_operation: 3000, quote_ttl_seconds: 300, quotes_paused: false }

/** Sesión + cliente admin. Toda consulta con admin DEBE filtrar por customer_id = user.id. */
export async function requireCustomer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = createAdminClient()
  // Asegura la fila de perfil aunque el trigger de alta no exista todavía.
  await admin.from('customer_profiles').upsert({ id: user.id, email: user.email ?? '' }, { onConflict: 'id', ignoreDuplicates: true })
  return { user, admin }
}

export async function getSettings(): Promise<Settings> {
  const { data } = await createAdminClient().from('portal_settings').select('*').eq('id', 1).maybeSingle()
  return data ? {
    min_usd: Number(data.min_usd),
    max_usd_per_operation: Number(data.max_usd_per_operation),
    quote_ttl_seconds: data.quote_ttl_seconds,
    quotes_paused: !!data.quotes_paused,
  } : DEFAULT_SETTINGS
}

/** Tasa vigente (automática). null = no se puede cotizar: pausa de emergencia, fuentes caídas o que se contradicen. */
export async function getCurrentFx(settings: Settings): Promise<number | null> {
  if (settings.quotes_paused) return null
  const market = await getMarketRate()
  if (!market || market.disagreement) return null
  return market.rate
}
