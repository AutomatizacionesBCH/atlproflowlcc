import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type Settings = { min_usd: number; max_usd_per_operation: number; quote_ttl_seconds: number; rate_max_age_minutes: number }

const DEFAULT_SETTINGS: Settings = { min_usd: 1, max_usd_per_operation: 3000, quote_ttl_seconds: 300, rate_max_age_minutes: 180 }

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
    rate_max_age_minutes: data.rate_max_age_minutes,
  } : DEFAULT_SETTINGS
}

/** Última tasa vigente y no vencida por antigüedad; null si no hay (no se cotiza con tasas viejas). */
export async function getCurrentFx(settings: Settings): Promise<number | null> {
  const now = new Date()
  const { data } = await createAdminClient()
    .from('fx_rates')
    .select('rate, valid_from, valid_until')
    .lte('valid_from', now.toISOString())
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  if (data.valid_until && new Date(data.valid_until) <= now) return null
  const ageMin = (now.getTime() - new Date(data.valid_from).getTime()) / 60_000
  if (ageMin > settings.rate_max_age_minutes) return null
  return Number(data.rate)
}
