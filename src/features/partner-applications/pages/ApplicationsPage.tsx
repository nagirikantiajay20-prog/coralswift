import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { ErrorState } from '@/components/common/states'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/forms/inputs'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { toAppError } from '@/services/api/errors'
import { ApplicationStatusBadge } from '../components/StatusBadgeFor'
import { useApplicationList, useReviewers } from '../hooks/useApplications'
import { PORTAL_STATUSES, type PortalStatus, type ReviewerApplication } from '../types'
import { formatDate, humanize, pageCount, shortId } from '../utils/format'

const PAGE_SIZE = 20
type Sort = 'newest' | 'oldest' | 'name'
type StatusFilter = PortalStatus | 'all' | 'unassigned'

export default function ApplicationsPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('reference') ?? '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<Sort>('newest')

  // Server-side: status, unassigned, page, page_size (the only list params in the spec).
  const q = useApplicationList({
    page,
    page_size: PAGE_SIZE,
    status: status === 'all' || status === 'unassigned' ? undefined : status,
    unassigned: status === 'unassigned' ? true : undefined,
  })
  // Reviewer names are only resolvable by super administrators (GET /admin/users).
  const reviewers = useReviewers(user?.role === 'super_administrator')
  const names = useMemo(
    () => new Map((reviewers.data ?? []).map((r) => [r.id, r.full_name])),
    [reviewers.data],
  )

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const out = (q.data?.rows ?? []).filter(
      (r) =>
        (!term ||
          r.reference.toLowerCase().includes(term) ||
          r.organization_name.toLowerCase().includes(term)) &&
        (!from || (r.submitted_at ?? '') >= from) &&
        (!to || (r.submitted_at ?? '') < `${to}T99`),
    )
    const t = (r: ReviewerApplication) => r.submitted_at ?? ''
    return out.sort((a, b) =>
      sort === 'name'
        ? a.organization_name.localeCompare(b.organization_name)
        : sort === 'oldest'
          ? t(a).localeCompare(t(b))
          : t(b).localeCompare(t(a)),
    )
  }, [q.data, search, from, to, sort])

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
    { header: 'Pathway', cell: (r) => humanize(r.pathway) },
    { header: 'Status', cell: (r) => <ApplicationStatusBadge status={r.status} /> },
    { header: 'Submitted', cell: (r) => formatDate(r.submitted_at) },
    { header: 'Submissions', cell: (r) => r.submission_count },
    {
      header: 'Reviewer',
      cell: (r) =>
        r.assigned_reviewer_id
          ? (names.get(r.assigned_reviewer_id) ?? shortId(r.assigned_reviewer_id))
          : 'Unassigned',
    },
    {
      header: 'Action',
      cell: (r) => (
        <Button asChild variant="secondary" size="sm">
          <Link to={r.id} aria-label={`View application ${r.reference}`}>
            View
          </Link>
        </Button>
      ),
    },
  ]

  const loaded = q.data?.rows.length ?? 0
  return (
    <>
      <PageHeader
        title="Partner Applications"
        description="Applications submitted through the Public Portal."
        actions={
          <Button variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={q.isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
            Refresh
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              label="Search reference or organization"
            />
          </div>
          <FilterDropdown<StatusFilter>
            label="Status"
            value={status}
            onChange={(v) => {
              setStatus(v)
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
          <FilterDropdown<Sort>
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'name', label: 'Organization A–Z' },
            ]}
          />
          <label className="text-xs text-muted">
            Submitted from
            <DatePicker value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            to
            <DatePicker value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <p className="border-b border-line px-4 py-2 text-xs text-muted">
          Status and “Unassigned” filter on the server. Search, date range and sorting apply to the
          current page only: the API offers no such parameters yet.
        </p>
        {q.isPending ? (
          <div className="space-y-2 p-4" role="status" aria-label="Loading applications">
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
              rows={rows}
              rowKey={(r) => r.id}
              emptyTitle={loaded ? 'No applications match your filters' : 'No applications found'}
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
