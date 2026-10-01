import 'server-only'

/**
 * Tasa USD→CLP automática. Regla de negocio: se usa el MENOR entre el dólar observado y una referencia de mercado
 * (hoy no hay fuente automática de Bloomberg; la referencia de mercado es open.er-api.com, actualizada a diario).
 * Salvaguardas: si las fuentes se contradicen (>3 %) o ninguna responde, NO se cotiza.
 */
export type RateSource = { name: string; value: number; asOf: string }
export type MarketRate = { rate: number; sources: RateSource[]; disagreement: boolean }

const MAX_DISAGREEMENT = 0.03
const sane = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 100 && n < 5000
const ageDays = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86_400_000

async function observado(): Promise<RateSource | null> {
  const res = await fetch('https://mindicador.cl/api/dolar', { next: { revalidate: 120 }, signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const last = ((await res.json()) as { serie?: { fecha: string; valor: number }[] }).serie?.[0]
  // El observado se publica solo en días hábiles: se tolera un fin de semana largo.
  return last && sane(last.valor) && ageDays(last.fecha) < 7 ? { name: 'Dólar observado (mindicador.cl)', value: last.valor, asOf: last.fecha } : null
}

async function mercado(): Promise<RateSource | null> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 120 }, signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const json = (await res.json()) as { result?: string; rates?: { CLP?: number }; time_last_update_utc?: string }
  const asOf = json.time_last_update_utc ? new Date(json.time_last_update_utc).toISOString() : null
  return json.result === 'success' && sane(json.rates?.CLP) && asOf && ageDays(asOf) < 4
    ? { name: 'Referencia de mercado (open.er-api.com)', value: json.rates.CLP, asOf } : null
}

export async function getMarketRate(): Promise<MarketRate | null> {
  const results = await Promise.allSettled([observado(), mercado()])
  const sources = results.flatMap(r => (r.status === 'fulfilled' && r.value ? [r.value] : []))
  if (sources.length === 0) return null

  const values = sources.map(s => s.value)
  const min = Math.min(...values)
  const disagreement = (Math.max(...values) - min) / min > MAX_DISAGREEMENT
  return { rate: Math.round(min * 100) / 100, sources, disagreement }
}
