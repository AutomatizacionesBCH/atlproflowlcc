'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  facing: 'environment' | 'user'
  title: string
  onCapture: (blob: Blob) => void
  onClose: () => void
}

export function CameraCapture({ facing, title, onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const unsupported = typeof navigator !== 'undefined' && !navigator.mediaDevices
  const [denied, setDenied] = useState(false)
  const error = unsupported
    ? 'Tu navegador no permite usar la cámara. Sube una foto desde tu galería.'
    : denied
      ? 'No pudimos acceder a la cámara. Revisa los permisos del navegador o sube una foto desde tu galería.'
      : null
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 } }, audio: false })
      .then(s => {
        if (cancelled) return s.getTracks().forEach(t => t.stop())
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play().then(() => setReady(true)).catch(() => {})
        }
      })
      .catch(() => setDenied(true))
    return () => {
      cancelled = true
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [facing])

  function snap() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d')!.drawImage(v, 0, 0)
    canvas.toBlob(b => b && onCapture(b), 'image/jpeg', 0.92)
  }

  const selfie = facing === 'user'

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-4 text-white">
        <p className="font-medium">{title}</p>
        <button onClick={onClose} aria-label="Cerrar cámara" className="rounded-full p-2 hover:bg-white/10">
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <p className="mx-auto mt-16 max-w-sm px-6 text-center text-white">{error}</p>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${selfie ? '-scale-x-100' : ''}`}
            />
            {/* Guía de encuadre */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`border-2 border-lime/90 ${selfie ? 'h-[60%] aspect-[3/4] rounded-[50%]' : 'w-[88%] aspect-[1.586] rounded-2xl'}`}
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-center p-6">
        <button
          onClick={snap}
          disabled={!ready || !!error}
          aria-label="Tomar foto"
          className="size-16 rounded-full border-4 border-white bg-lime disabled:opacity-40"
        />
      </div>
    </div>
  )
}
