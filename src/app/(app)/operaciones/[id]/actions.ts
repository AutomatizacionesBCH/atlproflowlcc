'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentFx, getSettings, requireCustomer } from '@/lib/portal/server'
import { quoteFromUsd } from '@/lib/pricing'
import { ACCOUNT_TYPES, BANKS } from '@/lib/status'
import { notifyTeamNewRequest } from '@/lib/email/notify'
import { formatCLP, formatUSD } from '@/lib/utils'

type Result = { error: string } | { ok: true } | { next: string }

export async function confirmOperationAction(input: {
  id: string; bank: string; accountType: string; accountNumber: string; accept: boolean; ownAccount: boolean
}): Promise<Result> {
  const { user, admin } = await requireCustomer()
  if (!input.accept) return { error: 'Debes aceptar la tasa y las condiciones para continuar.' }
  if (!input.ownAccount) return { error: 'Debes declarar que la cuenta es de tu titularidad.' }

  const bank = BANKS.find(b => b === input.bank)
  const type = ACCOUNT_TYPES.find(t => t.value === input.accountType)
  const number = input.accountNumber.replace(/\D/g, '')
  if (!bank || !type) return { error: 'Selecciona el banco y el tipo de cuenta.' }
  if (number.length < 6 || number.length > 20) return { error: 'El número de cuenta debe tener entre 6 y 20 dígitos.' }

  const [{ data: profile }, { data: req }] = await Promise.all([
    admin.from('customer_profiles').select('kyc_status, full_name, rut, email').eq('id', user.id).single(),
    admin.from('operation_requests').select('id, status, quote_expires_at, amount_usd, quoted_clp').eq('id', input.id).eq('customer_id', user.id).maybeSingle(),
  ])
  if (!req) return { error: 'No encontramos esta operación.' }
  if (req.status !== 'cotizada') return { error: 'Esta operación ya fue confirmada.' }
  if (profile?.kyc_status !== 'aprobado' || !profile.rut || !profile.full_name) {
    return { error: 'Debes verificar tu identidad antes de confirmar.' }
  }
  if (!req.quote_expires_at || new Date(req.quote_expires_at).getTime() < Date.now()) {
    return { error: 'La cotización venció. Vuelve a cotizar para ver la tasa actual.' }
  }

  const { error: accErr } = await admin.from('customer_bank_accounts').upsert(
    { customer_id: user.id, bank_name: bank, account_type: type.value, account_number: number },
    { onConflict: 'customer_id,bank_name,account_number', ignoreDuplicates: true },
  )
  if (accErr) return { error: 'No pudimos guardar tu cuenta bancaria.' }

  // Condición en el UPDATE: solo pasa si sigue 'cotizada' y vigente (evita doble confirmación y carreras).
  const { data: updated, error } = await admin.from('operation_requests').update({
    status: 'pendiente',
    confirmed_at: new Date().toISOString(),
    full_name: profile.full_name,
    document_id: profile.rut,
    email: profile.email,
    transfer_bank_name: bank,
    transfer_account_type: type.value,
    transfer_account_number: number,
  }).eq('id', input.id).eq('customer_id', user.id).eq('status', 'cotizada')
    .gt('quote_expires_at', new Date().toISOString()).select('id')
  if (error || !updated?.length) return { error: 'No pudimos confirmar la operación. Vuelve a cotizar.' }

  // Aviso al equipo (mejor esfuerzo: nunca hace fallar la confirmación).
  await notifyTeamNewRequest({
    id: input.id, fullName: profile.full_name, email: profile.email,
    usd: formatUSD(Number(req.amount_usd)), clp: formatCLP(Number(req.quoted_clp)), bank,
  })

  revalidatePath('/operaciones')
  return { ok: true }
}

/** Recotiza con la tasa vigente y el mismo monto en USD; la cotización anterior queda anulada. */
export async function requoteAction(id: string): Promise<Result> {
  const { user, admin } = await requireCustomer()
  const { data: old } = await admin.from('operation_requests').select('amount_usd, status')
    .eq('id', id).eq('customer_id', user.id).maybeSingle()
  if (!old || old.status !== 'cotizada') return { error: 'No se puede recotizar esta operación.' }

  const settings = await getSettings()
  const fx = await getCurrentFx(settings)
  if (!fx) return { error: 'La cotización no está disponible en este momento. Inténtalo en unos minutos.' }
  const q = quoteFromUsd(Number(old.amount_usd), fx)

  const { data, error } = await admin.from('operation_requests').insert({
    customer_id: user.id, source: 'portal', email: user.email,
    amount_usd: q.usd, quoted_fx: fx, quoted_payout_pct: q.payoutPct, quoted_clp: q.clp,
    quote_expires_at: new Date(Date.now() + settings.quote_ttl_seconds * 1000).toISOString(),
    status: 'cotizada',
  }).select('id').single()
  if (error || !data) return { error: 'No pudimos recotizar. Inténtalo de nuevo.' }

  await admin.from('operation_requests').update({ status: 'descartado', notes: 'Reemplazada por recotización' })
    .eq('id', id).eq('customer_id', user.id).eq('status', 'cotizada')
  return { next: `/operaciones/${data.id}` }
}
