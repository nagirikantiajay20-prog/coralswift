import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

/**
 * `value` undefined renders an em dash (data not available). `loading` shows a skeleton and
 * `error` an error marker, so a failed metric is never mistaken for zero.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  loading,
  error,
}: {
  label: string
  value?: number | string
  icon: LucideIcon
  hint?: string
  loading?: boolean
  error?: boolean
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <span className="rounded-md bg-warm p-2.5 text-coral-ink">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm text-muted">{label}</p>
        {loading ? (
          <div
            role="status"
            aria-label={`Loading ${label}`}
            className="my-1 h-7 w-16 animate-pulse rounded bg-surface"
          />
        ) : error ? (
          <p className="text-sm font-medium text-rose">Failed to load</p>
        ) : (
          <p className="font-heading text-2xl font-bold">{value ?? '—'}</p>
        )}
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </Card>
  )
}
