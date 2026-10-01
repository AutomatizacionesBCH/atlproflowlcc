'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, Clock, TrendingUp, Inbox, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isActive } from '@/lib/nav'

const ITEMS = [
  { href: '/', label: 'Nueva operación', icon: ArrowLeftRight },
  { href: '/operaciones', label: 'Mis operaciones', icon: Clock },
]
const ADMIN_ITEMS = [
  { href: '/admin/solicitudes', label: 'Solicitudes', icon: Inbox },
  { href: '/admin/tasa', label: 'Tasa', icon: TrendingUp },
]
// En el celular no hay barra lateral: el acceso a "mis datos" va como último ítem.
const ME = { href: '/ajustes', label: 'Mi cuenta', icon: UserRound }

export function MobileNav({ isAdmin, pending = 0 }: { isAdmin: boolean; pending?: number }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white lg:hidden">
      {[...ITEMS, ...(isAdmin ? ADMIN_ITEMS : []), ME].map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn('flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium', active ? 'text-brand' : 'text-ink-faint')}
          >
            <span className="relative">
              <Icon className="size-5" aria-hidden />
              {href === '/admin/solicitudes' && pending > 0 && (
                <span className="absolute -right-2 -top-1.5 rounded-full bg-lime px-1.5 text-[10px] font-bold text-brand">{pending}</span>
              )}
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
