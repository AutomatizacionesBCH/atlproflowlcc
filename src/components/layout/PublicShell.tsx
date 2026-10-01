import Image from 'next/image'
import Link from 'next/link'

/** Marco de la página pública (cotizador sin sesión). */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="flex h-16 items-center justify-between border-b border-line-subtle bg-white px-4 sm:px-8">
        <Image src="/brand/logo.png" alt="La Caja Chica" width={120} height={29} priority style={{ width: 120, height: 'auto' }} />
        <Link href="/login" className="rounded-lg border border-line-strong px-4 py-2 text-sm font-medium hover:border-brand">Ingresar</Link>
      </header>
      <main className="flex-1 px-4 py-10 sm:py-16">{children}</main>
      <footer className="px-4 pb-8 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} La Caja Chica · <Link href="/terminos" className="underline">Términos</Link> · <Link href="/privacidad" className="underline">Privacidad</Link>
      </footer>
    </div>
  )
}
