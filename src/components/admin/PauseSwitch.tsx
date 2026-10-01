'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pause, Play } from 'lucide-react'
import { setQuotesPausedAction } from '@/app/(app)/admin/tasa/actions'

export function PauseSwitch({ paused }: { paused: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!paused && !confirm('¿Pausar las cotizaciones? Los clientes verán “Cotización no disponible” hasta que las reanudes.')) return
          setError(null)
          start(async () => {
            const res = await setQuotesPausedAction(!paused)
            if ('error' in res) return setError(res.error)
            router.refresh()
          })
        }}
        className={`flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium disabled:opacity-50 ${paused ? 'bg-brand text-white hover:bg-brand-hover' : 'border border-danger text-danger hover:bg-red-50'}`}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
        {paused ? 'Reanudar cotizaciones' : 'Pausar cotizaciones'}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}
