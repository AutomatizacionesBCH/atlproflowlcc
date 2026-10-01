'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, Clock, Settings, TrendingUp, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/exchange', label: 'Nueva operación', icon: ArrowLeftRight },
  { href: '/operaciones', label: 'Operaciones', icon: Clock },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
]
const ADMIN_ITEMS = [
  { href: '/admin/solicitudes', label: 'Solicitudes', icon: Inbox },
  { href: '/admin/tasa', label: 'Tasa', icon: TrendingUp },
]

export function MobileNav({ isAdmin, pending = 0 }: { isAdmin: boolean; pending?: number }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white lg:hidden">
      {(isAdmin ? [...ITEMS, ...ADMIN_ITEMS] : ITEMS).map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn('flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium', active ? 'text-brand' : 'text-ink-faint')}
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
