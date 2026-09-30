import { Sidebar } from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // TODO(login): reemplazar por el email de la sesión de Supabase
  const userEmail = 'cliente@ejemplo.cl'

  return (
    <div className="flex h-screen">
      <div className="hidden lg:flex"><Sidebar userEmail={userEmail} /></div>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
