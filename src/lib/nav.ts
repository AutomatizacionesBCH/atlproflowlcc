/** ¿Está activo este ítem del menú? "Nueva operación" incluye el proceso en curso (/operacion/…); "Mis operaciones" las finalizadas. */
export function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/operacion/') || pathname.startsWith('/verificacion')
  return pathname === href || pathname.startsWith(`${href}/`)
}
