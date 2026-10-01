import 'server-only'

/** Dólar observado de referencia (mindicador.cl). Solo es una SUGERENCIA para el equipo; nunca se publica solo. */
export async function fetchObservedDollar(): Promise<{ value: number; date: string } | null> {
  try {
    const res = await fetch('https://mindicador.cl/api/dolar', { next: { revalidate: 600 }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const json = (await res.json()) as { serie?: { fecha: string; valor: number }[] }
    const last = json.serie?.[0]
    return last && Number.isFinite(last.valor) ? { value: last.valor, date: last.fecha } : null
  } catch {
    return null
  }
}
