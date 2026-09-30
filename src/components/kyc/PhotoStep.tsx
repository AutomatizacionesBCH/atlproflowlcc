'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, IdCard, Upload, UserRound } from 'lucide-react'
import { CameraCapture } from './CameraCapture'
import { compressImage } from '@/lib/kyc/image'

export type StepKind = 'front' | 'back' | 'selfie'

const COPY: Record<StepKind, { title: React.ReactNode; intro: string; tips: string[]; empty: string }> = {
  front: {
    title: <>Foto del <em className="font-serif">frente</em> de tu documento</>,
    intro: 'Fotografía el frente de tu carnet o pasaporte. Asegúrate de que se lea con claridad.',
    tips: ['Usa buena iluminación, evita sombras sobre el documento.', 'Encuadra el documento completo, sin cortar los bordes.', 'Evita reflejos de luz sobre el plástico o el papel.'],
    empty: 'Aún no has subido una foto',
  },
  back: {
    title: <>Foto del <em className="font-serif">dorso</em> de tu documento</>,
    intro: 'Ahora fotografía la parte de atrás de tu carnet. Si usas pasaporte, repite la página de datos.',
    tips: ['El código de barras o la franja inferior deben verse completos.', 'Mantén el documento plano y sin inclinar.', 'Evita reflejos de luz sobre el plástico.'],
    empty: 'Aún no has subido una foto',
  },
  selfie: {
    title: <>Ahora, una <em className="font-serif">selfie</em></>,
    intro: 'Con ella confirmamos que eres la persona del documento.',
    tips: ['Mira de frente a la cámara, con el rostro descubierto.', 'Sin lentes oscuros, gorro ni mascarilla.', 'Busca un lugar con luz de frente, no a contraluz.'],
    empty: 'Aún no has tomado tu selfie',
  },
}

type Props = {
  kind: StepKind
  photo: File | null
  onChange: (f: File | null) => void
}

export function PhotoStep({ kind, photo, onChange }: Props) {
  const copy = COPY[kind]
  const selfie = kind === 'selfie'
  const [camera, setCamera] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  async function accept(blob: Blob) {
    setBusy(true)
    setError(null)
    try {
      onChange(await compressImage(blob))
    } catch {
      setError('No pudimos procesar esa imagen. Prueba con otra foto.')
    } finally {
      setBusy(false)
      setCamera(false)
    }
  }

  const Icon = selfie ? UserRound : IdCard

  return (
    <section aria-labelledby={`t-${kind}`} className="mx-auto w-full max-w-md space-y-6 text-center">
      <h1 id={`t-${kind}`} className="text-3xl font-semibold leading-tight text-ink">{copy.title}</h1>
      <p className="text-ink-soft">{copy.intro}</p>

      <ul className="space-y-3 rounded-3xl border border-line bg-white p-6 text-left shadow-sm">
        {copy.tips.map(t => (
          <li key={t} className="flex gap-3 text-sm text-ink">
            <Check className="mt-0.5 size-5 shrink-0 text-lime" aria-hidden />
            {t}
          </li>
        ))}
      </ul>

      <div
        className={`flex min-h-56 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-line-strong bg-brand-muted ${photo ? 'border-solid border-lime' : ''}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto seleccionada" className={`max-h-72 w-full object-contain ${selfie ? '-scale-x-100' : ''}`} />
        ) : (
          <div className="space-y-3 p-6 text-ink-faint">
            <Icon className="mx-auto size-12 text-brand" aria-hidden />
            <p className="text-sm font-medium">{copy.empty}</p>
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setCamera(true)}
          disabled={busy}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-lime font-semibold text-brand transition-colors hover:brightness-95 disabled:opacity-50"
        >
          <Camera className="size-5" aria-hidden />
          {photo ? 'Repetir con la cámara' : 'Usar cámara'}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-brand hover:bg-brand-muted disabled:opacity-50"
        >
          <Upload className="size-4" aria-hidden />
          Subir desde mi galería
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Subir imagen desde el dispositivo"
          onChange={e => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void accept(f)
          }}
        />
      </div>

      {camera && (
        <CameraCapture
          facing={selfie ? 'user' : 'environment'}
          title={selfie ? 'Toma tu selfie' : kind === 'front' ? 'Frente del documento' : 'Dorso del documento'}
          onCapture={blob => void accept(blob)}
          onClose={() => setCamera(false)}
        />
      )}
    </section>
  )
}
