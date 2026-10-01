'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/portal/admin'

/** Interruptor de emergencia: mientras está pausado, nadie puede cotizar. */
export async function setQuotesPausedAction(paused: boolean): Promise<{ ok: true } | { error: string }> {
  const { admin } = await requireAdmin()
  const { error } = await admin.from('portal_settings').update({ quotes_paused: paused }).eq('id', 1)
  if (error) return { error: 'No pudimos cambiar el estado de las cotizaciones.' }
  revalidatePath('/admin/tasa')
  revalidatePath('/')
  return { ok: true }
}
