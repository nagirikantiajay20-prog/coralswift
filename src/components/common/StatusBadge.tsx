import { cn } from '@/lib/utils'

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const tones: Record<StatusTone, string> = {
  neutral: 'bg-surface text-navy-soft',
  info: 'bg-blue-50 text-blue-800',
  success: 'bg-emerald-50 text-emerald-800',
  warning: 'bg-amber-50 text-amber-900',
  danger: 'bg-rose-50 text-rose-800',
}

/**
 * Presentational only. Status values and their tone mapping come from the backend spec
 * (pending): features pass their own label + tone; no statuses are defined here.
 */
export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>
      {label}
    </span>
  )
}
