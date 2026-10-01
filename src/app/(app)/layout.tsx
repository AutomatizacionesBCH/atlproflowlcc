import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/portal/admin'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login') // defensa en profundidad: proxy.ts ya lo redirige
  const isAdmin = await isAdminEmail(user.email)

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      <div className="hidden lg:flex"><Sidebar userEmail={user.email ?? ''} isAdmin={isAdmin} /></div>
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">{children}</main>
      <MobileNav isAdmin={isAdmin} />
    </div>
  )
}
