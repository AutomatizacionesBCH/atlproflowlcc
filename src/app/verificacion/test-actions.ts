'use server'

import { requireAdmin } from '@/lib/portal/admin'
import { formatRutForStorage, validateRut } from '@/lib/rut'

type Result = { ok: true } | { error: string }

/**
 * MODO PRUEBAS: marca la cuenta del administrador como verificada sin pasar por el proveedor de identidad.
 * Solo funciona si ENABLE_KYC_TEST_MODE=true Y quien llama es administrador. Queda registrado como provider 'prueba-admin'
 * y el detalle de cada solicitud lo muestra con una advertencia. Apagar antes de abrir a clientes reales.
 */
export async function markVerifiedForTestAction(input: { name: string; rut: string }): Promise<Result> {
  if (process.env.ENABLE_KYC_TEST_MODE !== 'true') return { error: 'El modo de pruebas está desactivado.' }
  const { user, admin } = await requireAdmin()

  const name = input.name.trim().replace(/\s+/g, ' ')
  const rut = formatRutForStorage(input.rut)
  if (name.length < 3) return { error: 'Ingresa un nombre válido.' }
  if (!validateRut(rut)) return { error: 'El RUT no es válido (revisa el dígito verificador).' }

  const { data: other } = await admin.from('customer_profiles').select('id').eq('rut', rut).neq('id', user.id).maybeSingle()
  if (other) return { error: 'Ese RUT ya está asociado a otra cuenta.' }

  const { error } = await admin.from('customer_profiles').update({ kyc_status: 'aprobado', full_name: name, rut }).eq('id', user.id)
  if (error) return { error: 'No pudimos actualizar el perfil.' }
  await admin.from('kyc_verifications').insert({ customer_id: user.id, provider: 'prueba-admin', status: 'aprobado', reasons: ['MODO_PRUEBA'] })
  return { ok: true }
}
