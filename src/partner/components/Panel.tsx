import type { ReactNode } from 'react'
import { ErrorState } from '@/components/common/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toAppError } from '@/services/api/errors'

export const human = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
export const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—')
export const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—')
/** Untyped backend rows: read the first present string field; never invent a value. */
export const field = (row: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) if (typeof row[k] === 'string' && row[k]) return row[k] as string
}
export const errText = (e: unknown) => {
  const x = toAppError(e)
  return x.status === 403
    ? 'You do not have access to this information.'
    : x.status === 401
      ? 'Your session has expired. Please sign in again.'
      : x.message
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** Sub-section state: loading, error with retry, otherwise content. */
export function Async({
  q,
  children,
}: {
  q: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown }
  children: ReactNode
}) {
  if (q.isLoading)
    return (
      <div
        role="status"
        aria-label="Loading"
        className="h-4 w-2/3 animate-pulse rounded bg-surface"
      />
    )
  if (q.isError) return <ErrorState message={errText(q.error)} onRetry={() => q.refetch()} />
  return <>{children}</>
}
