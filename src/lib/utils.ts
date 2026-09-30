import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value)
}

/** Payout al cliente (% del bruto) según monto USD — regla de ProFlow OS */
export function suggestPayoutPct(amountUsd: number): number {
  if (amountUsd < 1000) return 78
  if (amountUsd < 2500) return 79
  if (amountUsd < 5000) return 80
  return 81
}

/** USD necesarios para recibir `clp`: el payout depende del monto USD, así que se busca el tramo consistente. */
export function usdFromClp(clp: number, fx: number): number {
  for (const pct of [78, 79, 80, 81]) {
    const usd = clp / (fx * (pct / 100))
    if (suggestPayoutPct(usd) === pct) return usd
  }
  return clp / (fx * 0.81)
}
