'use client'

import Script from 'next/script'
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      remove: (id: string) => void
    }
  }
}

/** Captcha de Cloudflare Turnstile. Solo se muestra si NEXT_PUBLIC_TURNSTILE_SITE_KEY está definida. */
export function TurnstileWidget({ onToken }: { onToken: (t: string | null) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const box = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  function mount() {
    if (!siteKey || !box.current || !window.turnstile || widgetId.current) return
    widgetId.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      language: 'es',
      callback: (t: string) => onToken(t),
      'expired-callback': () => onToken(null),
      'error-callback': () => onToken(null),
    })
  }

  useEffect(() => {
    mount()
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!siteKey) return null
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={mount} />
      <div ref={box} />
    </>
  )
}
