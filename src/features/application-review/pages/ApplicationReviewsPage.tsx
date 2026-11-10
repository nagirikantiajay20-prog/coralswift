import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ApplicationStatusBadge } from '@/features/partner-applications/components/StatusBadgeFor'
import { useApplicationList } from '@/features/partner-applications/hooks/useApplications'
import {
  PORTAL_STATUSES,
  type PortalStatus,
  type ReviewerApplication,
} from '@/features/partner-applications/types'
import {
  formatDate,
  humanize,
  pageCount,
  shortId,
} from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'

const PAGE_SIZE = 20
type Filter = PortalStatus | 'all' | 'unassigned'
/** Stages in which a reviewer still has work to do. */
const IN_REVIEW: PortalStatus[] = [
  'submitted',
  'eligibility_verification',
  'capability_review',
  'commercial_legal_review',
  'information_requested',
]

/** Review queue: the backend scopes the list to your assignments (super administrators see all submitted). */
export default function ApplicationReviewsPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<Filter>('all')
  const q = useApplicationList({
    page,
    page_size: PAGE_SIZE,
    status: filter === 'all' || filter === 'unassigned' ? undefined : filter,
    unassigned: filter === 'unassigned' ? true : undefined,
  })

  const columns: Column<ReviewerApplication>[] = [
    {
      header: 'Reference',
      cell: (r) => (
        <Link to={r.id} className="font-medium text-coral-ink underline">
          {r.reference}
        </Link>
      ),
    },
    { header: 'Organization', cell: (r) => r.organization_name },
    { header: 'Status', cell: (r) => <ApplicationStatusBadge status={r.status} /> },
    { header: 'Submitted', cell: (r) => formatDate(r.submitted_at) },
    {
      header: 'Reviewer',
      cell: (r) =>
        !r.assigned_reviewer_id
          ? 'Unassigned'
          : r.assigned_reviewer_id === user?.id
            ? 'You'
            : shortId(r.assigned_reviewer_id),
    },
    {
      header: 'Action',
      cell: (r) => (
        <Button asChild variant="secondary" size="sm">
          <Link to={r.id} aria-label={`Open review workspace for ${r.reference}`}>
            {IN_REVIEW.includes(r.status) ? 'Review' : 'Open'}
          </Link>
        </Button>
      ),
    },
  ]
  const loaded = q.data?.rows.length ?? 0
  return (
    <>
      <PageHeader
        title="Application Reviews"
        description="Open an application to examine it, record findings and decide."
        actions={
          <Button variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={q.isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
            Refresh
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <FilterDropdown<Filter>
            label="Status"
            value={filter}
            onChange={(v) => {
              setFilter(v)
              setPage(1)
            }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'unassigned', label: 'Unassigned' },
              ...PORTAL_STATUSES.filter((s) => s !== 'draft').map((s) => ({
                value: s,
                label: humanize(s),
              })),
            ]}
          />
        </div>
        {q.isPending ? (
          <div className="space-y-2 p-4" role="status" aria-label="Loading review queue">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-surface" />
            ))}
          </div>
        ) : q.isError ? (
          <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={q.data.rows}
              rowKey={(r) => r.id}
              emptyTitle="No applications in your review queue"
            />
            <Pagination
              page={page}
              pageCount={pageCount(q.data.meta, page, PAGE_SIZE, loaded)}
              onChange={setPage}
            />
          </>
        )}
      </Card>
    </>
  )
}
