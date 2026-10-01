import Image from 'next/image'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = { title: 'Ingresar | La Caja Chica' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const { redirectTo } = await searchParams

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <Image src="/brand/logo.png" alt="La Caja Chica" width={140} height={34} priority className="mb-12" style={{ width: 140, height: "auto" }} />
        <div className="w-full max-w-md">
          <LoginForm redirectTo={redirectTo} />
        </div>
        <p className="mt-16 text-xs text-ink-faint">© {new Date().getFullYear()} La Caja Chica</p>
      </main>

      <aside className="hidden flex-col justify-center bg-brand p-16 text-white lg:flex">
        <h2 className="max-w-md text-5xl font-semibold leading-tight">
          Convierte tu cupo en dólares a <em className="font-serif text-lime">pesos chilenos</em>
        </h2>
        <ul className="mt-12 max-w-md space-y-4">
          {[
            ['Cotiza tú mismo', 'Ve cuánto recibes al instante, sin llamar a nadie.'],
            ['Todo en tu cuenta', 'Historial de operaciones y comprobantes en un solo lugar.'],
            ['Identidad verificada', 'Tu cuenta y tus operaciones protegidas.'],
          ].map(([t, d]) => (
            <li key={t} className="rounded-2xl border border-white/20 p-5">
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-sm text-white/70">{d}</p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
