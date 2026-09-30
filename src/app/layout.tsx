import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono, IBM_Plex_Serif } from 'next/font/google'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
})
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
})

const plexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['italic'],
  variable: '--font-plex-serif',
})

export const metadata: Metadata = {
  title: 'La Caja Chica | Cambia tu cupo en dólares',
  description: 'Cotiza y cambia el cupo en dólares de tu tarjeta por pesos chilenos, desde tu cuenta.',
  icons: { icon: '/brand/logo-icon.jpg', apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = { themeColor: '#043D35' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${plexSans.variable} ${plexMono.variable} ${plexSerif.variable}`}>
      <body>{children}</body>
    </html>
  )
}
