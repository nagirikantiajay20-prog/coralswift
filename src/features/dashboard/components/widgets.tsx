import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChartCard } from '@/components/common/ChartCard'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toAppError } from '@/services/api/errors'

/** Minimal slice of a TanStack query result that the widgets need. */
export interface Q {
  isEnabled: boolean
  isPending: boolean
  isError: boolean
  error: unknown
  refetch: () => unknown
}

/** Renders the right state for a query: not permitted, loading, error, empty, or the content. */
export function QueryBody({ q, empty, children }: { q: Q; empty?: boolean; children: ReactNode }) {
  if (!q.isEnabled) {
    return <EmptyState title="Not available for your role" />
  }
  if (q.isPending) {
    return (
      <div
        role="status"
        aria-label="Loading"
        className="m-5 h-40 animate-pulse rounded bg-surface"
      />
    )
  }
  if (q.isError)
    return <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
  if (empty) return <EmptyState title="No data available" />
  return <>{children}</>
}

export function PendingBackend({ title, reason }: { title: string; reason: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState title="Pending backend support" description={reason} />
      </CardContent>
    </Card>
  )
}

export function ChartPanel({
  title,
  description,
  q,
  empty,
  children,
}: {
  title: string
  description?: string
  q: Q
  empty: boolean
  children: ReactNode
}) {
  if (!q.isEnabled || q.isPending || q.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <QueryBody q={q}>{null}</QueryBody>
      </Card>
    )
  }
  return (
    <ChartCard title={title} description={description} empty={empty}>
      {children}
    </ChartCard>
  )
}

export function RecentCard({
  title,
  q,
  empty,
  children,
  to,
}: {
  title: string
  q: Q
  empty: boolean
  children: ReactNode
  to?: string
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {to && q.isEnabled && (
          <Link to={to} className="text-sm text-coral-ink underline">
            View all
          </Link>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <QueryBody q={q} empty={empty}>
          {children}
        </QueryBody>
      </CardContent>
    </Card>
  )
}
