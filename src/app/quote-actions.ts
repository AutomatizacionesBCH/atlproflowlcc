'use server'

import { requireCustomer } from '@/lib/portal/server'
import { createQuote, nextStepFor } from '@/lib/portal/quote'

export async function createQuoteAction(input: { side: 'clp' | 'usd'; amount: number }): Promise<{ error: string } | { next: string }> {
  const { user } = await requireCustomer()
  const res = await createQuote(user, input.side === 'usd' ? 'usd' : 'clp', Number(input.amount))
  return 'error' in res ? res : { next: nextStepFor(res) }
}
