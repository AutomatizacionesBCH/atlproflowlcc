'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, Clock, LogOut, TrendingUp, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isActive } from '@/lib/nav'
import { signOutAction } from '@/app/login/actions'

// El cliente solo tiene 2 módulos. Los ítems de administración los ve únicamente el equipo.
const NAV = [
  { href: '/', label: 'Nueva operación', icon: ArrowLeftRight },
  { href: '/operaciones', label: 'Mis operaciones', icon: Clock },
]
const ADMIN_NAV = [
  { href: '/admin/solicitudes', label: 'Solicitudes', icon: Inbox },
  { href: '/admin/tasa', label: 'Tasa de cambio', icon: TrendingUp },
]

export function Sidebar({ userEmail, isAdmin, pending = 0 }: { userEmail: string; isAdmin: boolean; pending?: number }) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col bg-brand text-white">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <Image src="/brand/logo-icon.jpg" alt="" width={36} height={36} className="rounded-lg" />
        <span className="text-lg font-semibold tracking-tight">La Caja Chica</span>
      </div>

      <nav aria-label="Principal" className="flex-1 space-y-1 p-4">
        {(isAdmin ? [...NAV, ...ADMIN_NAV] : NAV).map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                active ? 'bg-lime text-brand' : 'text-white/80 hover:bg-white/10',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
              {href === '/admin/solicitudes' && pending > 0 && (
                <span className="ml-auto rounded-full bg-lime px-2 py-0.5 text-xs font-semibold text-brand" aria-label={`${pending} pendientes`}>{pending}</span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 px-2 py-2">
          {/* Los datos personales y cuentas se gestionan desde aquí, sin ser un módulo aparte. */}
          <Link href="/ajustes" title="Mis datos y cuentas" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg hover:bg-white/10">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lime text-sm font-semibold text-brand">
              {userEmail.charAt(0).toUpperCase() || 'C'}
            </span>
            <span className="min-w-0 truncate text-xs font-medium">{userEmail}</span>
          </Link>
          <form action={signOutAction}>
            <button type="submit" aria-label="Cerrar sesión" title="Cerrar sesión" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
