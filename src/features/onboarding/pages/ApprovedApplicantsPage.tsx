import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { ErrorState } from '@/components/common/states'
import { DatePicker } from '@/components/forms/inputs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ApplicationStatusBadge } from '@/features/partner-applications/components/StatusBadgeFor'
import { useReviewers } from '@/features/partner-applications/hooks/useApplications'
import type { PortalStatus, ReviewerApplication } from '@/features/partner-applications/types'
import { formatDate, humanize, shortId } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { useApprovedApplicants } from '../hooks/useOnboarding'
import { APPROVED_STATUSES } from '../types'

const PAGE_SIZE = 20
type Sort = 'newest' | 'oldest' | 'name'

export default function ApprovedApplicantsPage() {
  const q = useApprovedApplicants()
  const reviewers = useReviewers(true)
  const names = useMemo(
    () => new Map((reviewers.data ?? []).map((r) => [r.id, r.full_name])),
    [reviewers.data],
  )
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<PortalStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<Sort>('newest')

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const t = (r: ReviewerApplication) => r.submitted_at ?? ''
    return (q.data?.rows ?? [])
      .filter(
        (r) =>
          (status === 'all' || r.status === status) &&
          (!term ||
            r.reference.toLowerCase().includes(term) ||
            r.organization_name.toLowerCase().includes(term)) &&
          (!from || t(r) >= from) &&
          (!to || t(r) < `${to}T99`),
      )
      .sort((a, b) =>
        sort === 'name'
          ? a.organization_name.localeCompare(b.organization_name)
          : sort === 'oldest'
            ? t(a).localeCompare(t(b))
            : t(b).localeCompare(t(a)),
      )
  }, [q.data, status, search, from, to, sort])
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const view = rows.slice(
    (Math.min(page, pages) - 1) * PAGE_SIZE,
    Math.min(page, pages) * PAGE_SIZE,
  )
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(1)
    }

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
    { header: 'Onboarding status', cell: (r) => <ApplicationStatusBadge status={r.status} /> },
    { header: 'Submitted', cell: (r) => formatDate(r.submitted_at) },
    {
      header: 'Assigned administrator',
      cell: (r) =>
        r.assigned_reviewer_id
          ? (names.get(r.assigned_reviewer_id) ?? shortId(r.assigned_reviewer_id))
          : 'Unassigned',
    },
    {
      header: 'Action',
      cell: (r) => (
        <Button asChild variant="secondary" size="sm">
          <Link to={r.id} aria-label={`Open onboarding for ${r.reference}`}>
            {r.status === 'pilot_onboarding' ? 'Manage onboarding' : 'View'}
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Approved Applicants"
        description="Applications that reached the onboarding stages. Approval does not create a partner account."
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
              onChange={reset(setSearch)}
              label="Search reference or organization"
            />
          </div>
          <FilterDropdown<PortalStatus | 'all'>
            label="Status"
            value={status}
            onChange={reset(setStatus)}
            options={[
              { value: 'all', label: 'All onboarding stages' },
              ...APPROVED_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
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
            <DatePicker value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            to
            <DatePicker value={to} onChange={(e) => reset(setTo)(e.target.value)} />
          </label>
        </div>
        <p className="border-b border-line px-4 py-2 text-xs text-muted">
          The list API returns no applicant name, email, phone, business category, approval date or
          last-updated time; those appear in the workspace. Filtering, sorting and paging run in the
          browser over the loaded records (up to 100 per stage).
          {q.data?.truncated && ' Some records may not be shown: a stage returned a full page.'}
        </p>
        {q.isPending ? (
          <div className="space-y-2 p-4" role="status" aria-label="Loading approved applicants">
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
              rows={view}
              rowKey={(r) => r.id}
              emptyTitle={
                q.data.rows.length
                  ? 'No applicants match your filters'
                  : 'No approved applicants yet'
              }
            />
            <Pagination page={Math.min(page, pages)} pageCount={pages} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  )
}
