import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { isAdminEmail } from '@/lib/portal/admin'
import { createAdminClient } from '@/lib/supabase/admin'

/** Marco del cliente autenticado: sidebar (escritorio) + barra inferior (móvil). */
export async function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  const isAdmin = await isAdminEmail(email)
  // Solicitudes esperando revisión: globo en el menú del equipo.
  const pending = isAdmin
    ? (await createAdminClient().from('operation_requests').select('id', { count: 'exact', head: true }).eq('status', 'pendiente')).count ?? 0
    : 0

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      <div className="hidden lg:flex print:hidden"><Sidebar userEmail={email} isAdmin={isAdmin} pending={pending} /></div>
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">{children}</main>
      <div className="print:hidden"><MobileNav isAdmin={isAdmin} pending={pending} /></div>
    </div>
  )
}
