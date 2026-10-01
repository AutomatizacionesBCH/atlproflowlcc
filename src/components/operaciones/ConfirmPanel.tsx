'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, RefreshCw } from 'lucide-react'
import { confirmOperationAction, requoteAction } from '@/app/(app)/operaciones/[id]/actions'
import { ACCOUNT_TYPES, BANKS } from '@/lib/status'

type Props = {
  id: string
  expiresAt: string
  kycApproved: boolean
  holderName: string | null
  holderRut: string | null
  saved: { bank_name: string; account_type: string; account_number: string }[]
}

function useCountdown(iso: string) {
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)))
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000))), 1000)
    return () => clearInterval(t)
  }, [iso])
  return left
}

export function ConfirmPanel({ id, expiresAt, kycApproved, holderName, holderRut, saved }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const left = useCountdown(expiresAt)
  const expired = left <= 0
  const first = saved[0]
  const [bank, setBank] = useState(first?.bank_name ?? '')
  const [type, setType] = useState(first?.account_type ?? '')
  const [number, setNumber] = useState(first?.account_number ?? '')
  const [accept, setAccept] = useState(false)
  const [own, setOwn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mm = String(Math.floor(left / 60)).padStart(1, '0')
  const ss = String(left % 60).padStart(2, '0')

  function requote() {
    setError(null)
    start(async () => {
      const res = await requoteAction(id)
      if ('error' in res) return setError(res.error)
      if ('next' in res) router.push(res.next)
    })
  }

  function confirm(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await confirmOperationAction({ id, bank, accountType: type, accountNumber: number, accept, ownAccount: own })
      if ('error' in res) return setError(res.error)
      router.refresh()
    })
  }

  if (expired) {
    return (
      <div className="space-y-4 rounded-2xl border border-line bg-white p-6">
        <p className="font-medium">Esta cotización venció.</p>
        <p className="text-sm text-ink-soft">La tasa cambia con el mercado. Vuelve a cotizar para ver la tasa actual.</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button onClick={requote} disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand font-medium text-white hover:bg-brand-hover disabled:opacity-50">
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <><RefreshCw className="size-4" aria-hidden /> Cotizar de nuevo</>}
        </button>
      </div>
    )
  }

  if (!kycApproved) {
    return (
      <div className="space-y-4 rounded-2xl border border-line bg-white p-6">
        <p className="font-medium">Verifica tu identidad para continuar</p>
        <p className="text-sm text-ink-soft">Tu cotización se mantiene {mm}:{ss} min. Verificarte toma solo un par de minutos.</p>
        <Link href={`/verificacion?next=${encodeURIComponent(`/operacion/${id}`)}`} className="flex h-12 w-full items-center justify-center rounded-lg bg-brand font-medium text-white hover:bg-brand-hover">
          Verificar mi identidad
        </Link>
      </div>
    )
  }

  const filled = bank && type && number.replace(/\D/g, '').length >= 6
  return (
    <form onSubmit={confirm} className="space-y-5 rounded-2xl border border-line bg-white p-6">
      <p className="text-right text-xs text-ink-faint">Tasa garantizada por <span className="font-mono font-semibold text-ink">{mm}:{ss}</span></p>

      <div>
        <h2 className="font-semibold">¿Dónde te transferimos?</h2>
        <p className="mt-1 text-sm text-ink-soft">Solo a una cuenta a tu nombre{holderName ? <> ({holderName}{holderRut ? `, RUT ${holderRut}` : ''})</> : null}. No transferimos a terceros.</p>
      </div>

      {saved.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {saved.map(a => (
            <button type="button" key={`${a.bank_name}${a.account_number}`}
              onClick={() => { setBank(a.bank_name); setType(a.account_type); setNumber(a.account_number) }}
              className="rounded-full border border-line-strong px-3 py-1.5 text-xs hover:border-brand">
              {a.bank_name} ··{a.account_number.slice(-4)}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="bank" className="text-sm font-medium">Banco</label>
          <select id="bank" value={bank} onChange={e => setBank(e.target.value)} className="mt-1.5 h-12 w-full rounded-lg border border-line-strong bg-white px-3">
            <option value="">Selecciona…</option>
            {BANKS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="type" className="text-sm font-medium">Tipo de cuenta</label>
          <select id="type" value={type} onChange={e => setType(e.target.value)} className="mt-1.5 h-12 w-full rounded-lg border border-line-strong bg-white px-3">
            <option value="">Selecciona…</option>
            {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="number" className="text-sm font-medium">Número de cuenta</label>
          <input id="number" inputMode="numeric" value={number} onChange={e => setNumber(e.target.value.replace(/\D/g, '').slice(0, 20))}
            className="mt-1.5 h-12 w-full rounded-lg border border-line-strong px-3 font-mono" />
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={own} onChange={e => setOwn(e.target.checked)} className="mt-1 size-4 accent-[var(--color-brand)]" />
        <span>Declaro que esta cuenta está a mi nombre y RUT.</span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} className="mt-1 size-4 accent-[var(--color-brand)]" />
        <span>Acepto la tasa mostrada y los <Link href="/terminos" className="underline">términos</Link>. Entiendo que las operaciones confirmadas son finales.</span>
      </label>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <button type="submit" disabled={pending || !filled || !accept || !own}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-brand font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-ink-faint">
        {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : 'Confirmar operación'}
      </button>
    </form>
  )
}
