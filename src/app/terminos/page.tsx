import Link from 'next/link'

export const metadata = { title: 'Términos y condiciones | La Caja Chica' }

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Términos y condiciones</h1>
      <p className="mt-4 rounded-xl bg-brand-muted p-4 text-sm text-brand">
        Este documento está en preparación y será publicado antes del lanzamiento. Si tienes dudas, escríbenos.
      </p>
      <Link href="/" className="mt-8 inline-block text-sm underline">Volver</Link>
    </main>
  )
}
