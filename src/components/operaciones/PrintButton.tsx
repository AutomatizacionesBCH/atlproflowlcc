'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover print:hidden">
      <Printer className="size-4" aria-hidden /> Imprimir o guardar como PDF
    </button>
  )
}
