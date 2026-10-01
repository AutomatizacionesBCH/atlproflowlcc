import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireCustomer } from '@/lib/portal/server'
import { createQuote, nextStepFor } from '@/lib/portal/quote'

export const dynamic = 'force-dynamic'

/** Punto de entrada tras el login: toma la cotización hecha en la página pública y avanza a identidad / confirmación. */
export default async function Continuar({ searchParams }: { searchParams: Promise<{ side?: string; amount?: string }> }) {
  const { side, amount } = await searchParams
  const { user } = await requireCustomer()
  const n = Number(amount)
  if ((side !== 'clp' && side !== 'usd') || !Number.isFinite(n) || n <= 0) redirect('/')

  const res = await createQuote(user, side, n)
  if ('error' in res) {
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <p role="alert" className="text-danger">{res.error}</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-brand px-6 py-3 font-medium text-white">Volver a cotizar</Link>
      </main>
    )
  }
  redirect(nextStepFor(res))
}
