'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CircleAlert, Clock, Loader2, ShieldCheck } from 'lucide-react'
import { PhotoStep, type StepKind } from './PhotoStep'
import { cn } from '@/lib/utils'

const STEPS: { kind: StepKind; label: string }[] = [
  { kind: 'front', label: 'Frente' },
  { kind: 'back', label: 'Dorso' },
  { kind: 'selfie', label: 'Selfie' },
]

type Result = { status: 'aprobado' | 'en_revision' | 'rechazado'; message: string; attemptsLeft?: number }
type Phase = 'intro' | 'capture' | 'sending' | 'done'

export function VerificationFlow({ next = '/exchange' }: { next?: string }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [step, setStep] = useState(0)
  const [photos, setPhotos] = useState<Record<StepKind, File | null>>({ front: null, back: null, selfie: null })
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  async function submit() {
    setPhase('sending')
    setError(null)
    const body = new FormData()
    body.append('front', photos.front!)
    body.append('back', photos.back!)
    body.append('selfie', photos.selfie!)
    try {
      const res = await fetch('/api/kyc/verify', { method: 'POST', body })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'No pudimos completar la verificación.')
        setPhase('capture')
        return
      }
      setResult(json as Result)
      setPhase('done')
    } catch {
      setError('No pudimos conectar. Revisa tu internet e inténtalo de nuevo.')
      setPhase('capture')
    }
  }

  function retry() {
    setPhotos({ front: null, back: null, selfie: null })
    setStep(0)
    setResult(null)
    setPhase('capture')
  }

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-md space-y-8 text-center">
        <div className="mx-auto flex size-44 items-center justify-center rounded-[2.5rem] bg-brand-muted">
          <div className="flex size-28 items-center justify-center rounded-[1.75rem] bg-lime">
            <ShieldCheck className="size-12 text-brand" aria-hidden />
          </div>
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-ink">
          Vamos a validar tu <em className="font-serif">identidad</em>
        </h1>
        <p className="text-lg text-ink-soft">
          Este proceso toma solo un par de minutos. Te pediremos fotos del frente y dorso de tu documento de identidad, y luego una selfie para confirmar que eres tú.
        </p>
        <p className="rounded-3xl bg-brand-muted p-6 text-left text-ink">
          Busca un lugar con buena luz y ten tu carnet o pasaporte a mano antes de comenzar. Tus datos están protegidos y solo se usan para verificar tu identidad.
        </p>
        <button
          onClick={() => setPhase('capture')}
          className="h-14 w-full rounded-full bg-lime text-lg font-semibold text-brand transition-colors hover:brightness-95"
        >
          Comenzar verificación
        </button>
        <p className="text-xs text-ink-faint">
          Al continuar aceptas el tratamiento de tus datos según nuestra{' '}
          <Link href="/privacidad" className="underline">política de privacidad</Link>.
        </p>
      </div>
    )
  }

  if (phase === 'sending') {
    return (
      <div role="status" className="mx-auto max-w-md space-y-4 py-24 text-center">
        <Loader2 className="mx-auto size-10 animate-spin text-brand" aria-hidden />
        <h1 className="text-2xl font-semibold">Verificando tu identidad…</h1>
        <p className="text-ink-soft">Esto toma unos segundos. No cierres esta ventana.</p>
      </div>
    )
  }

  if (phase === 'done' && result) {
    const ok = result.status === 'aprobado'
    const review = result.status === 'en_revision'
    const Icon = ok ? ShieldCheck : review ? Clock : CircleAlert
    return (
      <div role="status" className="mx-auto max-w-md space-y-6 py-12 text-center">
        <div className={cn('mx-auto flex size-24 items-center justify-center rounded-[1.75rem]', ok ? 'bg-lime' : review ? 'bg-brand-muted' : 'bg-red-50')}>
          <Icon className={cn('size-10', ok ? 'text-brand' : review ? 'text-brand' : 'text-danger')} aria-hidden />
        </div>
        <h1 className="text-3xl font-semibold">
          {ok ? <>Identidad <em className="font-serif">verificada</em></> : review ? <>Estamos <em className="font-serif">revisando</em> tus datos</> : <>No pudimos <em className="font-serif">verificarte</em></>}
        </h1>
        <p className="text-ink-soft">{result.message}</p>
        {ok && (
          <Link href={next} className="flex h-14 w-full items-center justify-center rounded-full bg-lime text-lg font-semibold text-brand hover:brightness-95">
            Continuar con mi operación
          </Link>
        )}
        {review && (
          <Link href="/operaciones" className="flex h-14 w-full items-center justify-center rounded-full bg-lime text-lg font-semibold text-brand hover:brightness-95">
            Ir a mis operaciones
          </Link>
        )}
        {result.status === 'rechazado' && (
          (result.attemptsLeft ?? 0) > 0 ? (
            <>
              <button onClick={retry} className="h-14 w-full rounded-full bg-lime text-lg font-semibold text-brand hover:brightness-95">
                Intentar de nuevo
              </button>
              <p className="text-xs text-ink-faint">Te quedan {result.attemptsLeft} intento(s) hoy.</p>
            </>
          ) : (
            <p className="text-sm text-ink-soft">Alcanzaste el máximo de intentos por hoy. Escríbenos y te ayudamos.</p>
          )
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <ol aria-label="Progreso" className="flex justify-center gap-2">
        {STEPS.map((s, i) => {
          const active = i === step
          const done = i < step
          return (
            <li
              key={s.kind}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold',
                active ? 'border-brand bg-brand text-white' : done ? 'border-lime text-brand' : 'border-line text-ink-faint',
              )}
            >
              <span className={cn('flex size-6 items-center justify-center rounded-full text-xs', active ? 'bg-lime text-brand' : done ? 'bg-lime text-brand' : 'bg-line-subtle')}>
                {i + 1}
              </span>
              {s.label}
            </li>
          )
        })}
      </ol>

      <PhotoStep
        key={current.kind}
        kind={current.kind}
        photo={photos[current.kind]}
        onChange={f => setPhotos(p => ({ ...p, [current.kind]: f }))}
      />

      {error && <p role="alert" className="mx-auto max-w-md text-center text-sm text-danger">{error}</p>}

      <div className="mx-auto flex max-w-md gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="h-14 rounded-full border border-line-strong px-8 font-medium text-ink hover:bg-white">
            Atrás
          </button>
        )}
        <button
          disabled={!photos[current.kind]}
          onClick={() => (isLast ? void submit() : setStep(step + 1))}
          className="h-14 flex-1 rounded-full bg-brand font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          {isLast ? 'Verificar mi identidad' : 'Continuar'}
        </button>
      </div>
      <p className="text-center text-xs text-ink-faint">Verificación segura con Didit</p>
    </div>
  )
}
