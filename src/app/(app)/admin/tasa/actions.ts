'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/portal/admin'

type Result = { ok: true } | { error: string } | { needsConfirm: true; pct: number }

const MAX_JUMP = 0.03 // variación vs. la tasa anterior que exige confirmación explícita

export async function publishRateAction(input: { rate: number; note: string; confirmJump: boolean }): Promise<Result> {
  const { user, admin } = await requireAdmin()

  const rate = Math.round(Number(input.rate) * 100) / 100
  if (!Number.isFinite(rate) || rate < 100 || rate > 5000) return { error: 'Ingresa una tasa válida (entre 100 y 5.000).' }

  const { data: last } = await admin.from('fx_rates').select('rate').order('valid_from', { ascending: false }).limit(1).maybeSingle()
  if (last) {
    const change = (rate - Number(last.rate)) / Number(last.rate)
    if (Math.abs(change) > MAX_JUMP && !input.confirmJump) return { needsConfirm: true, pct: change * 100 }
  }

  const { error } = await admin.from('fx_rates').insert({
    rate, source: 'manual', note: input.note.trim().slice(0, 200) || null, created_by: user.email,
  })
  if (error) return { error: 'No pudimos publicar la tasa. Inténtalo de nuevo.' }

  revalidatePath('/admin/tasa')
  revalidatePath('/exchange')
  return { ok: true }
}
