'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { changeStatusAction } from '@/app/(app)/admin/solicitudes/actions'
import { ACTION_LABEL, NEXT_STATUS, type RequestStatus } from '@/lib/status'
import { cn } from '@/lib/utils'

export function StatusActions({ id, status }: { id: string; status: RequestStatus }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const options = NEXT_STATUS[status]

  if (options.length === 0) return <p className="text-sm text-ink-faint">Esta solicitud está cerrada.</p>

  function go(to: RequestStatus) {
    setError(null)
    start(async () => {
      const res = await changeStatusAction({ id, to, note })
      if ('error' in res) return setError(res.error)
      setNote('')
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="note" className="text-sm font-medium">Nota interna (obligatoria para anular)</label>
        <textarea id="note" value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500}
          className="mt-1.5 w-full rounded-lg border border-line-strong px-3 py-2 text-sm" />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map(to => (
          <button key={to} onClick={() => go(to)} disabled={pending}
            className={cn('flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium disabled:opacity-50',
              to === 'descartado' ? 'border border-danger text-danger hover:bg-red-50' : 'bg-brand text-white hover:bg-brand-hover')}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {ACTION_LABEL[to]}
          </button>
        ))}
      </div>
    </div>
  )
}
