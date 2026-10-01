import Link from 'next/link'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { requireCustomer } from '@/lib/portal/server'
import { DeleteAccountButton, PhoneForm } from '@/components/ajustes/SettingsForms'
import { formatRutForDisplay } from '@/lib/rut'
import { ACCOUNT_TYPES } from '@/lib/status'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ajustes | La Caja Chica' }

const KYC: Record<string, { label: string; ok: boolean }> = {
  sin_verificar: { label: 'Sin verificar', ok: false },
  en_proceso: { label: 'En proceso', ok: false },
  en_revision: { label: 'En revisión por nuestro equipo', ok: false },
  aprobado: { label: 'Identidad verificada', ok: true },
  rechazado: { label: 'No se pudo verificar', ok: false },
}

export default async function Ajustes() {
  const { user, admin } = await requireCustomer()
  const [{ data: p }, { data: accounts }] = await Promise.all([
    admin.from('customer_profiles').select('email, full_name, rut, phone, kyc_status').eq('id', user.id).single(),
    admin.from('customer_bank_accounts').select('id, bank_name, account_type, account_number').eq('customer_id', user.id).order('created_at', { ascending: false }),
  ])
  const kyc = KYC[p?.kyc_status ?? 'sin_verificar']

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-10">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <section aria-label="Mis datos" className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Mis datos</h2>
        <dl className="mt-3 divide-y divide-line-subtle text-sm">
          <div className="flex justify-between py-2"><dt className="text-ink-soft">Correo</dt><dd>{p?.email}</dd></div>
          <div className="flex justify-between py-2"><dt className="text-ink-soft">Nombre</dt><dd>{p?.full_name ?? '—'}</dd></div>
          <div className="flex justify-between py-2"><dt className="text-ink-soft">RUT</dt><dd className="font-mono">{p?.rut ? formatRutForDisplay(p.rut) : '—'}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-ink-faint">Tu nombre y RUT vienen de tu documento verificado y no se pueden editar.</p>
        <div className="mt-5 border-t border-line-subtle pt-5"><PhoneForm initial={p?.phone ?? ''} /></div>
      </section>

      <section aria-label="Verificación de identidad" className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Verificación de identidad</h2>
        <p className={`mt-3 flex items-center gap-2 text-sm font-medium ${kyc.ok ? 'text-brand' : 'text-warning'}`}>
          {kyc.ok ? <ShieldCheck className="size-5" aria-hidden /> : <ShieldAlert className="size-5" aria-hidden />} {kyc.label}
        </p>
        {!kyc.ok && p?.kyc_status !== 'en_revision' && (
          <Link href="/verificacion" className="mt-4 inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-medium text-white hover:bg-brand-hover">
            Verificar mi identidad
          </Link>
        )}
      </section>

      <section aria-label="Mis cuentas" className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">Mis cuentas bancarias</h2>
        {(accounts ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Aún no tienes cuentas guardadas. Se guardan al confirmar tu primera operación.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-subtle">
            {accounts!.map(a => {
              const label = `${a.bank_name} ··${String(a.account_number).slice(-4)}`
              return (
                <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-ink-faint">{ACCOUNT_TYPES.find(t => t.value === a.account_type)?.label}</p>
                  </div>
                  <DeleteAccountButton id={a.id} label={label} />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
