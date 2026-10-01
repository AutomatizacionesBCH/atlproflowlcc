import { suggestPayoutPct } from './utils'

/**
 * Cotización — aritmética entera (centavos USD, tasa con 4 decimales) para evitar errores de coma flotante.
 * El servidor es la única fuente de verdad: el navegador solo muestra una vista previa con estas mismas funciones.
 *
 *   clp = floor(usd × tasa × payout%)        (el cliente nunca recibe más de lo calculado)
 *   Si el cliente escribe CLP, se busca el USD mínimo (a 2 decimales) que entrega al menos esos CLP.
 */
export type Quote = { usd: number; clp: number; payoutPct: number; fx: number; effectiveRate: number }

const PCTS = [78, 79, 80, 81]

export function quoteFromUsd(usd: number, fx: number): Quote {
  const cents = BigInt(Math.round(usd * 100))
  const fx4 = BigInt(Math.round(fx * 10_000))
  const payoutPct = suggestPayoutPct(Number(cents) / 100)
  const clp = Number((cents * fx4 * BigInt(payoutPct)) / 100_000_000n)
  return { usd: Number(cents) / 100, clp, payoutPct, fx, effectiveRate: (fx * payoutPct) / 100 }
}

// USD mínimo de cada tramo de payout (ver suggestPayoutPct).
const TIER_MIN_CENTS: Record<number, bigint> = { 78: 1n, 79: 100_000n, 80: 250_000n, 81: 500_000n }

export function quoteFromClp(clp: number, fx: number): Quote {
  const fx4 = BigInt(Math.round(fx * 10_000))
  const target = BigInt(Math.round(clp))
  let best: bigint | null = null
  for (const pct of PCTS) {
    const den = fx4 * BigInt(pct)
    let cents = (target * 100_000_000n + den - 1n) / den // USD mínimo (techo) en este tramo
    if (cents < TIER_MIN_CENTS[pct]) cents = TIER_MIN_CENTS[pct] // entre tramos: sube al inicio del siguiente
    if (suggestPayoutPct(Number(cents) / 100) !== pct) continue
    if (best === null || cents < best) best = cents
  }
  // El tramo de 81 % no tiene techo, así que siempre hay candidato.
  return quoteFromUsd(Number(best) / 100, fx)
}
