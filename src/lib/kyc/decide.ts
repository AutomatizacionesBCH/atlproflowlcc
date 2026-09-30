/**
 * Decisión de KYC — función pura (sin I/O) para poder probarla sola.
 * La decisión final SIEMPRE se toma en el servidor, nunca en el navegador.
 */

export type KycStatus = 'aprobado' | 'en_revision' | 'rechazado'

export type DiditWarning = { risk: string; log_type: 'error' | 'warning' | 'information' }

export type DecideInput = {
  id: { status: 'Approved' | 'Declined'; warnings: DiditWarning[]; dateOfBirth: string | null }
  liveness: { status: 'Approved' | 'Declined'; warnings: DiditWarning[] }
  faceMatch: { status: 'Approved' | 'Declined'; score: number | null }
  rutValid: boolean
  rutDuplicate: boolean
  now?: Date
}

export type Decision = { status: KycStatus; reasons: string[]; message: string }

// Mensajes en lenguaje simple para el cliente (nunca códigos crudos de Didit).
const RISK_MESSAGES: Record<string, string> = {
  DOCUMENT_EXPIRED: 'Tu documento de identidad está vencido.',
  SCREEN_CAPTURE_DETECTED: 'Fotografía el documento físico, no una pantalla.',
  PRINTED_COPY_DETECTED: 'Usa tu documento original, no una copia impresa.',
  NAME_NOT_DETECTED: 'No pudimos leer tu nombre. Intenta con más luz y sin reflejos.',
  DATE_OF_BIRTH_NOT_DETECTED: 'No pudimos leer tu fecha de nacimiento. Intenta con más luz.',
  DOCUMENT_NUMBER_NOT_DETECTED: 'No pudimos leer el número de tu documento. Intenta con más luz.',
  NO_FACE_DETECTED: 'No vimos tu rostro en la selfie. Mira de frente a la cámara.',
  LOW_LIVENESS_SCORE: 'No pudimos confirmar que eres una persona real. Intenta con mejor luz.',
  LIVENESS_FACE_ATTACK: 'No pudimos confirmar que eres una persona real.',
  LOW_FACE_MATCH_SIMILARITY: 'Tu selfie no coincide con la foto de tu documento.',
}

const GENERIC_REJECT = 'No pudimos verificar tu identidad con las fotos enviadas. Intenta nuevamente.'

function ageAt(dob: string, now: Date): number {
  const d = new Date(`${dob}T00:00:00Z`)
  let age = now.getUTCFullYear() - d.getUTCFullYear()
  const m = now.getUTCMonth() - d.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--
  return age
}

export function decideKyc(input: DecideInput): Decision {
  const now = input.now ?? new Date()
  const reasons: string[] = []
  const messages = new Set<string>()

  const errors = [
    ...input.id.warnings.filter(w => w.log_type === 'error'),
    ...input.liveness.warnings.filter(w => w.log_type === 'error'),
  ]
  for (const w of errors) {
    reasons.push(w.risk)
    if (RISK_MESSAGES[w.risk]) messages.add(RISK_MESSAGES[w.risk])
  }

  // 1) Rechazo duro: el cliente puede reintentar con mejores fotos.
  if (input.id.status !== 'Approved') reasons.push('ID_DECLINED')
  if (input.liveness.status !== 'Approved') reasons.push('LIVENESS_DECLINED')
  if (input.faceMatch.status !== 'Approved') {
    reasons.push('FACE_MATCH_DECLINED')
    messages.add(RISK_MESSAGES.LOW_FACE_MATCH_SIMILARITY)
  }

  // Regla de negocio: solo mayores de 18 años (términos del servicio).
  if (input.id.dateOfBirth && ageAt(input.id.dateOfBirth, now) < 18) {
    reasons.push('UNDERAGE')
    return { status: 'rechazado', reasons, message: 'Debes ser mayor de 18 años para operar.' }
  }

  if (reasons.length > 0) {
    return { status: 'rechazado', reasons, message: [...messages][0] ?? GENERIC_REJECT }
  }

  // 2) Pasó la biometría, pero hay algo que debe mirar una persona del equipo.
  const review: string[] = []
  if (!input.rutValid) review.push('RUT_NO_VALIDO_O_NO_LEGIBLE')
  if (input.rutDuplicate) review.push('RUT_YA_REGISTRADO')
  if (input.id.warnings.some(w => w.risk.startsWith('POSSIBLE_DUPLICATED'))) review.push('POSIBLE_USUARIO_DUPLICADO')

  if (review.length > 0) {
    return {
      status: 'en_revision',
      reasons: review,
      message: 'Recibimos tu verificación. Nuestro equipo la está revisando y te avisaremos por correo.',
    }
  }

  return { status: 'aprobado', reasons: [], message: 'Tu identidad fue verificada.' }
}
