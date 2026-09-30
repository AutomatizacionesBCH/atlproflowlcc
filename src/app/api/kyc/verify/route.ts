import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DiditError, faceMatch, passiveLiveness, portraitToBlob, verifyId } from '@/lib/kyc/didit'
import { decideKyc, type Decision } from '@/lib/kyc/decide'
import { formatRutForStorage, validateRut } from '@/lib/rut'

const MAX_ATTEMPTS_PER_DAY = 3
const MAX_BYTES = 5 * 1024 * 1024 // límite de Didit para imágenes de rostro

function asImage(v: FormDataEntryValue | null): File | null {
  if (!(v instanceof File) || v.size === 0 || v.size > MAX_BYTES) return null
  return /^image\/(jpeg|png|webp)$/.test(v.type) ? v : null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })

  const form = await request.formData()
  const front = asImage(form.get('front'))
  const back = asImage(form.get('back'))
  const selfie = asImage(form.get('selfie'))
  if (!front || !back || !selfie) {
    return NextResponse.json({ error: 'Faltan fotos o no tienen un formato válido.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Tope de intentos por día (cada intento cuesta créditos de Didit y es vector de abuso).
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count } = await admin
    .from('kyc_verifications')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', user.id)
    .gte('created_at', since)
  if ((count ?? 0) >= MAX_ATTEMPTS_PER_DAY) {
    return NextResponse.json(
      { error: 'Llegaste al máximo de intentos por hoy. Inténtalo mañana o contáctanos.' },
      { status: 429 },
    )
  }

  const { data: attempt, error: insErr } = await admin
    .from('kyc_verifications')
    .insert({ customer_id: user.id, provider: 'didit', status: 'en_proceso' })
    .select('id')
    .single()
  if (insErr || !attempt) return NextResponse.json({ error: 'No pudimos iniciar la verificación.' }, { status: 500 })

  try {
    const id = await verifyId(front, back, user.id)
    const live = await passiveLiveness(selfie, user.id)
    const portrait = id.data.portrait_image
    if (!portrait) throw new Error('Didit no devolvió el retrato del documento')
    const match = await faceMatch(selfie, await portraitToBlob(portrait), user.id)

    // En cédulas chilenas el RUN puede venir como personal_number o document_number: usar el primero válido.
    const rut = [id.data.personal_number, id.data.document_number]
      .filter((v): v is string => !!v)
      .map(formatRutForStorage)
      .find(validateRut) ?? null

    let rutDuplicate = false
    if (rut) {
      const { data: other } = await admin
        .from('customer_profiles').select('id').eq('rut', rut).neq('id', user.id).maybeSingle()
      rutDuplicate = !!other
    }

    const decision: Decision = decideKyc({
      id: { status: id.data.status, warnings: id.data.warnings ?? [], dateOfBirth: id.data.date_of_birth ?? null },
      liveness: { status: live.data.status, warnings: live.data.warnings ?? [] },
      faceMatch: { status: match.data.status, score: match.data.score },
      rutValid: !!rut,
      rutDuplicate,
    })

    await admin.from('kyc_verifications').update({
      status: decision.status,
      reasons: decision.reasons,
      didit_request_ids: { id: id.requestId, liveness: live.requestId, face_match: match.requestId },
      face_match_score: match.data.score,
      updated_at: new Date().toISOString(),
    }).eq('id', attempt.id)

    // Solo se guarda el RUT si no pertenece a otra cuenta (UNIQUE) y la persona fue aprobada o queda en revisión.
    await admin.from('customer_profiles').update({
      kyc_status: decision.status,
      ...(decision.status !== 'rechazado' && rut && !rutDuplicate ? { rut } : {}),
      ...(decision.status !== 'rechazado' && id.data.full_name ? { full_name: id.data.full_name } : {}),
    }).eq('id', user.id)

    return NextResponse.json({
      status: decision.status,
      message: decision.message,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS_PER_DAY - ((count ?? 0) + 1)),
    })
  } catch (e) {
    // Fallo nuestro o de Didit (no del cliente): no cuenta como intento ni cambia su estado.
    await admin.from('kyc_verifications').delete().eq('id', attempt.id)
    if (e instanceof DiditError && e.status === 400) {
      return NextResponse.json({
        status: 'rechazado',
        message: 'No pudimos reconocer tu documento. Fotografía tu cédula completa, con buena luz.',
        attemptsLeft: MAX_ATTEMPTS_PER_DAY - (count ?? 0),
      })
    }
    console.error('[kyc] error de verificación', e instanceof DiditError ? e.status : (e as Error).message)
    return NextResponse.json({ error: 'El servicio de verificación no está disponible. Intenta en unos minutos.' }, { status: 502 })
  }
}
