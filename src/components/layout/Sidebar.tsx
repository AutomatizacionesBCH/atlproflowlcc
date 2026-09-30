'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, Clock, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/exchange',    label: 'Nueva operación', icon: ArrowLeftRight },
  { href: '/operaciones', label: 'Mis operaciones', icon: Clock },
]

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col bg-brand text-white">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <Image src="/brand/logo-icon.jpg" alt="" width={36} height={36} className="rounded-lg" />
        <span className="text-lg font-semibold tracking-tight">La Caja Chica</span>
      </div>

      <nav aria-label="Principal" className="flex-1 space-y-1 p-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
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
            </Link>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-4">
        <Link
          href="/ajustes"
          aria-current={pathname.startsWith('/ajustes') ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
            pathname.startsWith('/ajustes') ? 'bg-lime text-brand' : 'text-white/80 hover:bg-white/10',
          )}
        >
          <Settings className="size-4" aria-hidden />
          Ajustes
        </Link>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-lime text-sm font-semibold text-brand">
            {userEmail.charAt(0).toUpperCase() || 'C'}
          </span>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-medium">{userEmail}</p>
            <p className="text-white/60">Cerrar sesión</p>
          </div>
          <LogOut className="size-4 text-white/60" aria-hidden />
        </div>
      </div>
    </aside>
  )
}
