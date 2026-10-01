'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, Loader2 } from 'lucide-react'
import { markVerifiedForTestAction } from '@/app/verificacion/test-actions'

export function TestModePanel({ next }: { next: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [name, setName] = useState('')
  const [rut, setRut] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await markVerifiedForTestAction({ name, rut })
      if ('error' in res) return setError(res.error)
      router.push(next)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="mx-auto mb-8 max-w-md space-y-3 rounded-2xl border-2 border-dashed border-warning bg-amber-50 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-warning"><FlaskConical className="size-4" aria-hidden /> Modo de pruebas (solo administradores)</p>
      <p className="text-xs text-ink-soft">Marca tu cuenta como verificada sin usar el proveedor de identidad. No uses esto con clientes reales.</p>
      <div>
        <label htmlFor="t-name" className="text-sm font-medium">Nombre completo</label>
        <input id="t-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line-strong bg-white px-3" />
      </div>
      <div>
        <label htmlFor="t-rut" className="text-sm font-medium">RUT</label>
        <input id="t-rut" value={rut} onChange={e => setRut(e.target.value)} placeholder="12.345.678-5" className="mt-1 h-11 w-full rounded-lg border border-line-strong bg-white px-3 font-mono" />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={pending || !name || !rut} className="flex h-11 w-full items-center justify-center rounded-lg bg-warning font-medium text-white disabled:opacity-50">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Marcar mi cuenta como verificada'}
      </button>
    </form>
  )
}
