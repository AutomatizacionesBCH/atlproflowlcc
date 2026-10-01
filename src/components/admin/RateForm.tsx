'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { publishRateAction } from '@/app/(app)/admin/tasa/actions'

export function RateForm({ suggested }: { suggested: number | null }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [raw, setRaw] = useState('')
  const [note, setNote] = useState('')
  const [jump, setJump] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const rate = Number(raw.replace(',', '.')) || 0

  function publish(confirmJump: boolean) {
    setMsg(null)
    start(async () => {
      const res = await publishRateAction({ rate, note, confirmJump })
      if ('needsConfirm' in res) return setJump(res.pct)
      if ('error' in res) return setMsg({ ok: false, text: res.error })
      setJump(null); setRaw(''); setNote('')
      setMsg({ ok: true, text: 'Tasa publicada. Ya está vigente para los clientes.' })
      router.refresh()
    })
  }

  return (
    <form onSubmit={e => { e.preventDefault(); if (rate > 0) publish(false) }} className="space-y-4">
      <div>
        <label htmlFor="rate" className="text-sm font-medium">Nueva tasa (CLP por USD)</label>
        <div className="mt-1.5 flex gap-2">
          <input id="rate" inputMode="decimal" value={raw} onChange={e => { setRaw(e.target.value.replace(/[^\d.,]/g, '')); setJump(null) }}
            placeholder="0,00" className="h-12 flex-1 rounded-lg border border-line-strong px-4 text-right font-mono text-lg" />
          {suggested && (
            <button type="button" onClick={() => { setRaw(String(suggested).replace('.', ',')); setJump(null) }}
              className="rounded-lg border border-line-strong px-3 text-xs hover:border-brand">
              Usar observado ({suggested.toLocaleString('es-CL')})
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-ink-faint">Regla: el menor entre el dólar observado y Bloomberg.</p>
      </div>

      <div>
        <label htmlFor="note" className="text-sm font-medium">Nota (opcional)</label>
        <input id="note" value={note} onChange={e => setNote(e.target.value)} maxLength={200}
          placeholder="Ej.: observado 972,6 / Bloomberg 971,9" className="mt-1.5 h-12 w-full rounded-lg border border-line-strong px-4" />
      </div>

      {jump !== null && (
        <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-warning">
          Esta tasa varía <strong>{jump > 0 ? '+' : ''}{jump.toFixed(1)}%</strong> respecto a la anterior. ¿Es correcto?
          <button type="button" onClick={() => publish(true)} disabled={pending} className="mt-3 block h-10 rounded-lg bg-warning px-4 font-medium text-white">
            Sí, publicar de todos modos
          </button>
        </div>
      )}

      {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-sm text-brand' : 'text-sm text-danger'}>{msg.text}</p>}

      <button type="submit" disabled={pending || rate <= 0}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-brand font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-ink-faint">
        {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : 'Publicar tasa'}
      </button>
    </form>
  )
}
