import Image from 'next/image'
import { VerificationFlow } from '@/components/kyc/VerificationFlow'
import { safeRedirect } from '@/lib/safe-redirect'
import { TestModePanel } from '@/components/kyc/TestModePanel'
import { isAdminEmail } from '@/lib/portal/admin'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Verifica tu identidad | La Caja Chica' }

export default async function VerificacionPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const { data: { user } } = await (await createClient()).auth.getUser()
  const testMode = process.env.ENABLE_KYC_TEST_MODE === 'true' && (await isAdminEmail(user?.email))
  return (
    <div className="min-h-screen bg-page">
      <header className="flex h-16 items-center justify-center border-b border-line-subtle bg-white">
        <Image src="/brand/logo.png" alt="La Caja Chica" width={120} height={29} priority style={{ width: 120, height: "auto" }} />
      </header>
      <main className="px-4 py-10 sm:py-14">
        {testMode && <TestModePanel next={safeRedirect(next)} />}
        <VerificationFlow next={safeRedirect(next)} />
      </main>
    </div>
  )
}
