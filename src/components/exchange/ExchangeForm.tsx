'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpDown, Check } from 'lucide-react'
import { formatCLP, suggestPayoutPct, usdFromClp } from '@/lib/utils'

// TODO(fx_rates): la tasa debe venir publicada por el equipo desde la BD, nunca fija en el cliente.
const DEMO_FX = 900

type Side = 'clp' | 'usd'

export function ExchangeForm() {
  const router = useRouter()
  const [side, setSide] = useState<Side>('clp')
  const [raw, setRaw] = useState('')

  const value = Number(raw.replace(',', '.')) || 0
  // Si el cliente escribe CLP a recibir, se despeja el USD; el payout depende del USD.
  const usd = side === 'usd' ? value : usdFromClp(value, DEMO_FX)
  const payout = suggestPayoutPct(usd)
  const clp = side === 'clp' ? value : usd * DEMO_FX * (payout / 100)
  const effectiveRate = DEMO_FX * (payout / 100)
  const valid = value > 0

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="border-b border-line-subtle bg-page p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">Mercado abierto</p>
        <h1 className="mt-2 text-2xl font-semibold">¿Cuánto cupo quieres cambiar?</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Ingresa el monto en pesos chilenos (CLP) o dólares (USD).
        </p>
      </div>

      <form className="space-y-4 p-6" onSubmit={(e) => { e.preventDefault(); if (valid) router.push('/verificacion') }}>
        <div>
          <label htmlFor="monto" className="text-xs font-medium uppercase tracking-wider text-ink-soft">
            {side === 'clp' ? 'Quiero recibir' : 'Voy a pagar'}
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="monto"
              inputMode="decimal"
              placeholder="0,00"
              value={raw}
              onChange={(e) => setRaw(e.target.value.replace(/[^\d.,]/g, ''))}
              className="h-12 flex-1 rounded-lg border border-line-strong px-4 text-right font-mono text-lg"
            />
            <span className="w-10 font-semibold">{side === 'clp' ? 'CLP' : 'USD'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setSide(side === 'clp' ? 'usd' : 'clp'); setRaw('') }}
            aria-label="Intercambiar monedas"
            className="flex size-10 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-hover"
          >
            <ArrowUpDown className="size-4" aria-hidden />
          </button>
          <span className="rounded-full bg-brand-muted px-3 py-1.5 font-mono text-xs text-brand">
            1 USD = {effectiveRate.toLocaleString('es-CL', { maximumFractionDigits: 2 })} CLP
          </span>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">
            {side === 'clp' ? 'Voy a pagar' : 'Recibirás'}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <output className="flex h-12 flex-1 items-center justify-end rounded-lg border border-line bg-page px-4 font-mono text-lg">
              {valid
                ? side === 'clp'
                  ? usd.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : formatCLP(clp)
                : '0,00'}
            </output>
            <span className="w-10 font-semibold">{side === 'clp' ? 'USD' : 'CLP'}</span>
          </div>
        </div>

        <div className="rounded-xl bg-brand-muted p-4 text-sm text-brand">
          <p className="flex items-center gap-2 font-medium">
            <Check className="size-4" aria-hidden /> Sin comisión oculta
          </p>
          <p className="mt-1 text-xs leading-relaxed">
            La tasa incluye nuestro margen. Puedes hacer múltiples operaciones si necesitas cambiar más.
          </p>
        </div>

        <button
          type="submit"
          disabled={!valid}
          className="h-12 w-full rounded-lg bg-brand font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          Continuar
        </button>
        <p className="text-center text-xs text-ink-faint">
          Se requerirá verificar tu identidad para continuar. Solo se permite una cuenta por RUT.
        </p>
      </form>
    </div>
  )
}
