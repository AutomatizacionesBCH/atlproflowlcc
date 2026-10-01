'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpDown, Check, Loader2 } from 'lucide-react'
import { formatCLP, formatUSD } from '@/lib/utils'
import { quoteFromClp, quoteFromUsd } from '@/lib/pricing'
import { createQuoteAction } from '@/app/(app)/exchange/actions'

type Side = 'clp' | 'usd'

// CLP: solo enteros. USD: coma o punto decimal, hasta 2 decimales.
function parseAmount(raw: string, side: Side): number {
  if (side === 'clp') return Number(raw.replace(/\D/g, '')) || 0
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function ExchangeForm({ fx, minUsd, maxUsd }: { fx: number; minUsd: number; maxUsd: number }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [side, setSide] = useState<Side>('clp')
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)

  const value = parseAmount(raw, side)
  // Vista previa con la misma aritmética que el servidor; el servidor recalcula al continuar.
  const q = value > 0 ? (side === 'usd' ? quoteFromUsd(value, fx) : quoteFromClp(value, fx)) : null
  const outOfRange = q ? q.usd < minUsd || q.usd > maxUsd : false
  const rangeMsg = q && q.usd > maxUsd
    ? `El límite por operación es ${formatUSD(maxUsd)}. Puedes hacer varias operaciones.`
    : q && q.usd < minUsd ? `El monto mínimo es ${formatUSD(minUsd)}.` : null
  const valid = !!q && !outOfRange

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || pending) return
    setError(null)
    start(async () => {
      const res = await createQuoteAction({ side, amount: value })
      if ('error' in res) return setError(res.error)
      router.push(res.next)
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="border-b border-line-subtle bg-page p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">Mercado abierto</p>
        <h1 className="mt-2 text-2xl font-semibold">¿Cuánto cupo quieres cambiar?</h1>
        <p className="mt-2 text-sm text-ink-soft">Ingresa el monto en pesos chilenos (CLP) o dólares (USD).</p>
      </div>

      <form className="space-y-4 p-6" onSubmit={submit}>
        <div>
          <label htmlFor="monto" className="text-xs font-medium uppercase tracking-wider text-ink-soft">
            {side === 'clp' ? 'Quiero recibir' : 'Voy a pagar'}
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="monto"
              inputMode={side === 'clp' ? 'numeric' : 'decimal'}
              placeholder={side === 'clp' ? '0' : '0,00'}
              value={raw}
              onChange={e => setRaw(e.target.value.replace(side === 'clp' ? /[^\d]/g : /[^\d.,]/g, ''))}
              className="h-12 flex-1 rounded-lg border border-line-strong px-4 text-right font-mono text-lg"
            />
            <span className="w-10 font-semibold">{side === 'clp' ? 'CLP' : 'USD'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setSide(side === 'clp' ? 'usd' : 'clp'); setRaw(''); setError(null) }}
            aria-label="Intercambiar monedas"
            className="flex size-10 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-hover"
          >
            <ArrowUpDown className="size-4" aria-hidden />
          </button>
          <span className="rounded-full bg-brand-muted px-3 py-1.5 font-mono text-xs text-brand">
            1 USD = {(q?.effectiveRate ?? fx * 0.78).toLocaleString('es-CL', { maximumFractionDigits: 2 })} CLP
          </span>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">
            {side === 'clp' ? 'Voy a pagar' : 'Recibirás'}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <output className="flex h-12 flex-1 items-center justify-end rounded-lg border border-line bg-page px-4 font-mono text-lg">
              {q ? (side === 'clp' ? q.usd.toLocaleString('es-CL', { minimumFractionDigits: 2 }) : formatCLP(q.clp)) : '0,00'}
            </output>
            <span className="w-10 font-semibold">{side === 'clp' ? 'USD' : 'CLP'}</span>
          </div>
        </div>

        <div className="rounded-xl bg-brand-muted p-4 text-sm text-brand">
          <p className="flex items-center gap-2 font-medium"><Check className="size-4" aria-hidden /> Sin comisión oculta</p>
          <p className="mt-1 text-xs leading-relaxed">
            La tasa incluye nuestro margen. Límite de {formatUSD(maxUsd)} por operación; puedes hacer múltiples operaciones si necesitas cambiar más.
          </p>
        </div>

        {(rangeMsg || error) && <p role="alert" className="text-sm text-danger">{error ?? rangeMsg}</p>}

        <button
          type="submit"
          disabled={!valid || pending}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-brand font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : 'Continuar'}
        </button>
        <p className="text-center text-xs text-ink-faint">
          Se requerirá verificar tu identidad para continuar. Solo se permite una cuenta por RUT.
        </p>
      </form>
    </div>
  )
}
