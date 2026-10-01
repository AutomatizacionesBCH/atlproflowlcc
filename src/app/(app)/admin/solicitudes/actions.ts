'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/portal/admin'
import { NEXT_STATUS, type RequestStatus } from '@/lib/status'

type Result = { ok: true } | { error: string }

export async function changeStatusAction(input: { id: string; to: RequestStatus; note: string }): Promise<Result> {
  const { user, admin } = await requireAdmin()
  const note = input.note.trim().slice(0, 500)

  const { data: cur } = await admin.from('operation_requests').select('status').eq('id', input.id).maybeSingle()
  if (!cur) return { error: 'No encontramos la solicitud.' }
  const from = cur.status as RequestStatus
  if (!NEXT_STATUS[from]?.includes(input.to)) return { error: 'Ese cambio de estado no está permitido.' }
  if (input.to === 'descartado' && note.length < 3) return { error: 'Indica el motivo de la anulación.' }

  // UPDATE condicionado al estado leído: si otra persona ya la cambió, no pisa su cambio.
  const { data: updated } = await admin.from('operation_requests')
    .update({ status: input.to }).eq('id', input.id).eq('status', from).select('id')
  if (!updated?.length) return { error: 'Otra persona acaba de cambiar esta solicitud. Recarga la página.' }

  await admin.from('request_events').insert({
    request_id: input.id, actor: user.email, from_status: from, to_status: input.to, note: note || null,
  })

  revalidatePath('/admin/solicitudes')
  revalidatePath(`/admin/solicitudes/${input.id}`)
  revalidatePath('/operaciones')
  return { ok: true }
}
