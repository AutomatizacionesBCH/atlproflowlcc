'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteAccountAction, updatePhoneAction } from '@/app/(app)/ajustes/actions'

export function PhoneForm({ initial }: { initial: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [phone, setPhone] = useState(initial)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  return (
    <form onSubmit={e => {
      e.preventDefault(); setMsg(null)
      start(async () => {
        const res = await updatePhoneAction(phone)
        if ('error' in res) return setMsg({ ok: false, text: res.error })
        setMsg({ ok: true, text: 'Teléfono guardado.' }); router.refresh()
      })
    }} className="space-y-3">
      <label htmlFor="phone" className="text-sm font-medium">Teléfono de contacto</label>
      <div className="flex gap-2">
        <input id="phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+56912345678"
          className="h-11 flex-1 rounded-lg border border-line-strong px-3 font-mono" />
        <button type="submit" disabled={pending} className="flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'Guardar'}
        </button>
      </div>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-sm text-brand' : 'text-sm text-danger'}>{msg.text}</p>}
    </form>
  )
}

export function DeleteAccountButton({ id, label }: { id: string; label: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button type="button" disabled={pending} aria-label={`Eliminar cuenta ${label}`}
      onClick={() => { if (confirm(`¿Eliminar la cuenta ${label}?`)) start(async () => { await deleteAccountAction(id); router.refresh() }) }}
      className="rounded-lg p-2 text-ink-faint hover:bg-red-50 hover:text-danger disabled:opacity-50">
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
    </button>
  )
}
