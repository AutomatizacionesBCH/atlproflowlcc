import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) redirect('/login') // defensa en profundidad: proxy.ts ya lo redirige
  return <AppShell email={user.email ?? ''}>{children}</AppShell>
}
