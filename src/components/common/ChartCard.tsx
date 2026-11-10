import type { ReactNode } from 'react'
import { EmptyState } from '@/components/common/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** Titled card for a chart. `empty` shows the empty state instead of children. */
export function ChartCard({
  title,
  description,
  empty,
  children,
}: {
  title: string
  description?: string
  empty?: boolean
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState title="No data available" />
        ) : (
          <div className="h-60" role="img" aria-label={title}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
