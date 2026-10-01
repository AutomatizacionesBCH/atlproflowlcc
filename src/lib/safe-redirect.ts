/** Solo rutas internas ("/algo"); evita open-redirect con "//evil.com" o "https://…". */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return fallback
  return target
}
