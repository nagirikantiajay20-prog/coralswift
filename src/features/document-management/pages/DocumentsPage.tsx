import { FileCheck, FileClock, FileMinus, FileText, FileX, RefreshCw, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { ErrorState } from '@/components/common/states'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DocumentQueue, useQueueCount } from '../components/DocumentQueue'
import { ApplicationStatusBadge } from '@/features/partner-applications/components/StatusBadgeFor'
import { useApplicationList } from '@/features/partner-applications/hooks/useApplications'
import {
  PORTAL_STATUSES,
  type PortalStatus,
  type ReviewerApplication,
} from '@/features/partner-applications/types'
import { formatDate, humanize, pageCount } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'

const PAGE_SIZE = 20
const NA = 'Unavailable: the backend has no admin-wide document endpoint'

/** Backend-scoped application list; documents are reached per application (the only admin read path). */
export default function DocumentsPage() {
  const total = useQueueCount()
  const pending = useQueueCount('pending')
  const accepted = useQueueCount('accepted')
  const rejected = useQueueCount('rejected')
  const clarification = useQueueCount('clarification_needed')
  const metric = (c: typeof total) => ({
    value: c.data,
    loading: c.isPending,
    error: c.isError,
    hint: c.isSuccess && c.data === undefined ? 'Backend returned no total' : undefined,
  })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<PortalStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const list = useApplicationList({
    page,
    page_size: PAGE_SIZE,
    status: status === 'all' ? undefined : status,
  })
  const term = q.trim().toLowerCase()
  const rows = (list.data?.rows ?? []).filter(
    (r) => !term || `${r.reference} ${r.organization_name}`.toLowerCase().includes(term),
  )

  const columns: Column<ReviewerApplication>[] = [
    { header: 'Application', cell: (r) => <span className="font-medium">{r.reference}</span> },
    { header: 'Organization', cell: (r) => r.organization_name },
    { header: 'Status', cell: (r) => <ApplicationStatusBadge status={r.status} /> },
    { header: 'Submitted', cell: (r) => formatDate(r.submitted_at) },
    {
      header: 'Documents',
      cell: (r) => (
        <Button asChild variant="secondary" size="sm">
          <Link to={`/admin/documents/${r.id}`} aria-label={`View documents for ${r.reference}`}>
            View documents
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Document Management"
        description="Review documents attached to partner applications and onboarding."
        actions={
          <Button variant="secondary" onClick={() => list.refetch()} disabled={list.isFetching}>
            <RefreshCw className={list.isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
            Refresh
          </Button>
        }
      />
      <section
        aria-label="Document metrics"
        className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard label="Total documents" icon={FileText} {...metric(total)} />
        <StatCard label="Pending review" icon={FileClock} {...metric(pending)} />
        <StatCard label="Accepted" icon={FileCheck} {...metric(accepted)} />
        <StatCard label="Rejected" icon={FileX} {...metric(rejected)} />
        <StatCard label="Clarification needed" icon={RefreshCw} {...metric(clarification)} />
        <StatCard label="Missing documents" icon={FileMinus} hint={NA} />
        <StatCard label="Recently uploaded" icon={Upload} hint={NA} />
      </section>
      <p className="mb-4 text-sm text-muted">
        Counts are shown per application (open one below) because global totals cannot be computed
        accurately from paginated applications. Enquiry attachments stay on their enquiry (
        <Link to="/admin/enquiries" className="underline">
          Enquiries
        </Link>
        ); strategic attachments remain restricted to authorised staff.
      </p>
      <DocumentQueue />
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <div className="w-full sm:w-64">
            <SearchInput value={q} onChange={setQ} label="Search this page" />
          </div>
          <FilterDropdown<PortalStatus | 'all'>
            label="Application status"
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            options={[
              { value: 'all', label: 'All statuses' },
              ...PORTAL_STATUSES.filter((s) => s !== 'draft').map((s) => ({
                value: s,
                label: humanize(s),
              })),
            ]}
          />
        </div>
        {list.isPending ? (
          <div className="space-y-2 p-4" role="status" aria-label="Loading applications">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-surface" />
            ))}
          </div>
        ) : list.isError ? (
          <ErrorState message={toAppError(list.error).message} onRetry={() => list.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              emptyTitle="No applications found"
            />
            <Pagination
              page={page}
              pageCount={pageCount(list.data.meta, page, PAGE_SIZE, list.data.rows.length)}
              onChange={setPage}
            />
          </>
        )}
      </Card>
    </>
  )
}
