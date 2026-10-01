import { redirect } from 'next/navigation'

// Ruta anterior del cotizador: ahora es la página principal.
export default function Exchange() {
  redirect('/')
}
