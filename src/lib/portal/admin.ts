import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** ¿Este email está autorizado como administrador del portal? */
export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  const { data } = await createAdminClient().from('portal_admins').select('email').eq('email', email.toLowerCase()).maybeSingle()
  return !!data
}

/** Para pantallas y acciones de administración: sin sesión → login; sin permiso → fuera. */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await isAdminEmail(user.email))) redirect('/')
  return { user, admin: createAdminClient() }
}
