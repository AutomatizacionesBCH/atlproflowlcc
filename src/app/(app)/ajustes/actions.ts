'use server'

import { revalidatePath } from 'next/cache'
import { requireCustomer } from '@/lib/portal/server'

type Result = { ok: true } | { error: string }

export async function updatePhoneAction(phone: string): Promise<Result> {
  const { user, admin } = await requireCustomer()
  const clean = phone.replace(/[^\d+]/g, '')
  if (clean && !/^\+?\d{8,15}$/.test(clean)) return { error: 'Ingresa un teléfono válido (ej.: +56912345678).' }
  const { error } = await admin.from('customer_profiles').update({ phone: clean || null }).eq('id', user.id)
  if (error) return { error: 'No pudimos guardar tu teléfono.' }
  revalidatePath('/ajustes')
  return { ok: true }
}

export async function deleteAccountAction(accountId: string): Promise<Result> {
  const { user, admin } = await requireCustomer()
  const { error } = await admin.from('customer_bank_accounts').delete().eq('id', accountId).eq('customer_id', user.id)
  if (error) return { error: 'No pudimos eliminar la cuenta.' }
  revalidatePath('/ajustes')
  return { ok: true }
}
