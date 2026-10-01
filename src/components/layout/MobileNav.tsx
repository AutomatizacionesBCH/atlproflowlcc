'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, Clock, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/exchange', label: 'Nueva operación', icon: ArrowLeftRight },
  { href: '/operaciones', label: 'Operaciones', icon: Clock },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white lg:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn('flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium', active ? 'text-brand' : 'text-ink-faint')}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
