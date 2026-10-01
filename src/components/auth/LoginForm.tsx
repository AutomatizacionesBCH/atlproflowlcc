'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { safeRedirect } from '@/lib/safe-redirect'
import { TurnstileWidget } from './TurnstileWidget'

const RESEND_SECONDS = 60
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function friendly(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Pediste demasiados códigos. Espera un momento e inténtalo de nuevo.'
  if (m.includes('expired') || m.includes('invalid')) return 'El código no es válido o ya venció. Revisa el correo o pide uno nuevo.'
  if (m.includes('captcha')) return 'No pudimos validar que eres una persona. Recarga la página e inténtalo de nuevo.'
  return 'No pudimos completar la acción. Inténtalo de nuevo.'
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)
  const captchaRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus()
  }, [step])

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    if (busy || !EMAIL_RE.test(email.trim())) return
    setBusy(true)
    setError(null)
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, ...(captcha ? { captchaToken: captcha } : {}) },
    })
    setBusy(false)
    if (error) return setError(friendly(error.message))
    setStep('code')
    setCode('')
    setCooldown(RESEND_SECONDS)
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (busy || code.length !== 6) return
    setBusy(true)
    setError(null)
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: 'email',
    })
    if (error) {
      setBusy(false)
      return setError(friendly(error.message))
    }
    router.replace(safeRedirect(redirectTo))
    router.refresh()
  }

  const canSendEmail = EMAIL_RE.test(email.trim()) && (!captchaRequired || !!captcha)

  if (step === 'code') {
    return (
      <form onSubmit={verify} className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Revisa tu correo</h1>
          <p className="mt-2 text-ink-soft">
            Enviamos un código de 6 dígitos a <strong className="text-ink">{email}</strong>.
          </p>
        </div>

        <div>
          <label htmlFor="code" className="text-sm font-medium text-ink">Código</label>
          <input
            id="code"
            ref={codeRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="mt-2 h-14 w-full rounded-xl border-2 border-line-strong text-center font-mono text-2xl tracking-[0.5em] focus:border-brand focus:outline-none"
          />
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : 'Ingresar'}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={() => { setStep('email'); setError(null) }} className="text-ink-soft underline">
            Cambiar correo
          </button>
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={cooldown > 0 || busy}
            className="font-medium text-brand underline disabled:text-ink-faint disabled:no-underline"
          >
            {cooldown > 0 ? `Reenviar en ${cooldown} s` : 'Reenviar código'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={sendCode} className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold text-ink">Ingresa tu email</h1>
        <p className="mt-2 text-ink-soft">Accede o crea tu cuenta en segundos.</p>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium text-ink">Email</label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="mt-2 h-14 w-full rounded-xl border-2 border-line-strong px-4 focus:border-brand focus:outline-none"
        />
      </div>

      <TurnstileWidget onToken={setCaptcha} />

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={busy || !canSendEmail}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-ink-faint"
      >
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <>Continuar <ArrowRight className="size-4" aria-hidden /></>}
      </button>

      <p className="flex items-start gap-2 text-xs text-ink-faint">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Tu información está protegida con cifrado de extremo a extremo. Te enviaremos un código a tu correo; no necesitas contraseña.
      </p>
    </form>
  )
}
