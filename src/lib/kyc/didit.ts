import 'server-only'
import type { DiditWarning } from './decide'

// Standalone APIs de Didit (docs.didit.me/standalone-apis). Auth: header x-api-key, solo desde el servidor.
const BASE = 'https://verification.didit.me/v3'

export class DiditError extends Error {
  constructor(public status: number, public body: string) {
    super(`Didit ${status}`)
  }
}

async function post<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.DIDIT_API_KEY! },
    body: form,
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new DiditError(res.status, await res.text().catch(() => ''))
  return res.json() as Promise<T>
}

export type IdVerification = {
  status: 'Approved' | 'Declined'
  document_type?: string
  document_number?: string | null
  personal_number?: string | null
  full_name?: string | null
  date_of_birth?: string | null
  issuing_state?: string | null
  portrait_image?: string | null
  warnings: DiditWarning[]
}

export async function verifyId(front: File, back: File | null, vendorData: string) {
  const form = new FormData()
  form.append('front_image', front, 'front.jpg')
  if (back) form.append('back_image', back, 'back.jpg')
  form.append('vendor_data', vendorData)
  const out = await post<{ request_id: string; id_verification: IdVerification }>('/id-verification/', form)
  return { requestId: out.request_id, data: out.id_verification }
}

export async function passiveLiveness(selfie: File, vendorData: string) {
  const form = new FormData()
  form.append('user_image', selfie, 'selfie.jpg')
  form.append('face_liveness_score_decline_threshold', process.env.KYC_LIVENESS_MIN ?? '60')
  form.append('vendor_data', vendorData)
  const out = await post<{ request_id: string; liveness: { status: 'Approved' | 'Declined'; score: number | null; warnings: DiditWarning[] } }>(
    '/passive-liveness/', form,
  )
  return { requestId: out.request_id, data: out.liveness }
}

export async function faceMatch(selfie: File, reference: Blob, vendorData: string) {
  const form = new FormData()
  form.append('user_image', selfie, 'selfie.jpg')
  form.append('ref_image', reference, 'portrait.jpg')
  form.append('face_match_score_decline_threshold', process.env.KYC_FACE_MATCH_MIN ?? '60')
  form.append('vendor_data', vendorData)
  const out = await post<{ request_id: string; face_match: { status: 'Approved' | 'Declined'; score: number | null } }>(
    '/face-match/', form,
  )
  return { requestId: out.request_id, data: out.face_match }
}

/** `portrait_image` llega como URL o como base64, según `save_api_request`. */
export async function portraitToBlob(portrait: string): Promise<Blob> {
  if (/^https?:\/\//.test(portrait)) {
    const res = await fetch(portrait, { signal: AbortSignal.timeout(20_000) })
    if (!res.ok) throw new Error('No se pudo descargar el retrato del documento')
    return res.blob()
  }
  const b64 = portrait.replace(/^data:[^;]+;base64,/, '')
  return new Blob([Buffer.from(b64, 'base64')], { type: 'image/jpeg' })
}
