import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/portal/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login') // defensa en profundidad: proxy.ts ya lo redirige
  const isAdmin = await isAdminEmail(user.email)
  // Solicitudes esperando revisión: se muestra como globo en el menú del equipo.
  const pending = isAdmin
    ? (await createAdminClient().from('operation_requests').select('id', { count: 'exact', head: true }).eq('status', 'pendiente')).count ?? 0
    : 0

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      <div className="hidden lg:flex"><Sidebar userEmail={user.email ?? ''} isAdmin={isAdmin} pending={pending} /></div>
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">{children}</main>
      <MobileNav isAdmin={isAdmin} pending={pending} />
    </div>
  )
}
