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

const TZ = 'America/Santiago'

/** dd-mm-aaaa hh:mm (hora de Chile) */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('es-CL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d).replaceAll('/', '-')
  const time = new Intl.DateTimeFormat('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return `${date} ${time}`
}

export function isPast(iso: string | null | undefined): boolean {
  return !!iso && new Date(iso).getTime() < Date.now()
}
