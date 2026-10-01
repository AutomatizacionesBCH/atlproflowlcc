import { STATUS_LABEL, type RequestStatus } from '@/lib/status'
import { cn } from '@/lib/utils'

const TONE = {
  neutral: 'bg-line-subtle text-ink-soft',
  warn: 'bg-amber-50 text-warning',
  ok: 'bg-brand-muted text-brand',
  bad: 'bg-red-50 text-danger',
}

export function StatusBadge({ status, expired }: { status: RequestStatus; expired?: boolean }) {
  const s = expired && status === 'cotizada' ? { label: 'Vencida', tone: 'bad' as const } : STATUS_LABEL[status]
  return <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', TONE[s.tone])}>{s.label}</span>
}
