/** "17.590.573-1" → "17590573-1" (formato de almacenamiento) */
export function formatRutForStorage(rut: string): string {
  return rut.replace(/[.\s]/g, '').toUpperCase()
}

/** "17590573-1" → "17.590.573-1" (formato de visualización) */
export function formatRutForDisplay(rut: string): string {
  const [body = '', dv = ''] = formatRutForStorage(rut).split('-')
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dv ? `${withDots}-${dv}` : withDots
}

/** Valida formato y dígito verificador (módulo 11) */
export function validateRut(rut: string): boolean {
  const clean = formatRutForStorage(rut)
  if (!/^\d{6,8}-[\dK]$/.test(clean)) return false
  const [body, dv] = clean.split('-')
  let sum = 0
  let mult = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mult
    mult = mult === 7 ? 2 : mult + 1
  }
  const rest = 11 - (sum % 11)
  const expected = rest === 11 ? '0' : rest === 10 ? 'K' : String(rest)
  return dv === expected
}
