export type RequestStatus = 'cotizada' | 'pendiente' | 'revisado' | 'convertido' | 'descartado'

// Etiquetas para el cliente: nunca se muestra el enum crudo.
export const STATUS_LABEL: Record<RequestStatus, { label: string; tone: 'neutral' | 'warn' | 'ok' | 'bad' }> = {
  cotizada:   { label: 'Cotizada',     tone: 'neutral' },
  pendiente:  { label: 'En revisión',  tone: 'warn' },
  revisado:   { label: 'En proceso',   tone: 'warn' },
  convertido: { label: 'Completada',   tone: 'ok' },
  descartado: { label: 'Anulada',      tone: 'bad' },
}

export const BANKS = [
  'Banco de Chile', 'BancoEstado', 'Banco Santander', 'BCI', 'Scotiabank', 'Banco Itaú', 'Banco Falabella',
  'Banco Ripley', 'Banco BICE', 'Banco Security', 'Banco Consorcio', 'Coopeuch', 'Mercado Pago', 'Tenpo', 'MACH', 'Otro',
] as const

export const ACCOUNT_TYPES = [
  { value: 'corriente', label: 'Cuenta corriente' },
  { value: 'vista', label: 'Cuenta vista / RUT' },
  { value: 'ahorro', label: 'Cuenta de ahorro' },
] as const
