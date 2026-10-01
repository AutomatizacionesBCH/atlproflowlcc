import Image from 'next/image'
import { VerificationFlow } from '@/components/kyc/VerificationFlow'

export const metadata = { title: 'Verifica tu identidad | La Caja Chica' }

export default function VerificacionPage() {
  return (
    <div className="min-h-screen bg-page">
      <header className="flex h-16 items-center justify-center border-b border-line-subtle bg-white">
        <Image src="/brand/logo.png" alt="La Caja Chica" width={120} height={29} priority style={{ width: 120, height: "auto" }} />
      </header>
      <main className="px-4 py-10 sm:py-14">
        <VerificationFlow />
      </main>
    </div>
  )
}
