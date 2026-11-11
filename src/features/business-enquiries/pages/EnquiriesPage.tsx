import { RefreshCw } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { hideRestricted, visibleEnquiryTypes } from '@/features/follow-ups/utils/followUps'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { ErrorState } from '@/components/common/states'
import { DatePicker } from '@/components/forms/inputs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { dayEnd, dayStart } from '@/features/dashboard/utils/transform'
import {
  formatDate,
  humanize,
  pageCount,
  shortId,
} from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { EnquiryStatusBadge, PriorityBadge } from '../components/EnquiryBadges'
import { useEnquiryList } from '../hooks/useEnquiries'
import {
  DISCUSSION_TYPES,
  ENQUIRY_STATUSES,
  PRIORITIES,
  type DiscussionType,
  type EnquiryListParams,
  type EnquiryRow,
  type EnquiryStatus,
  type EnquiryType,
  type Priority,
} from '../types'

const PAGE_SIZE = 20
type Sort = 'newest' | 'oldest' | 'name'
type Assign = 'all' | 'unassigned' | 'mine'
type Attention = 'all' | 'overdue' | 'sla_breached'

const TITLE = {
  all: 'All Enquiries',
  project: 'Project Enquiries',
  general: 'General Enquiries',
  strategic: 'Strategic / M&A Enquiries',
}

export default function EnquiriesPage({
  scope = 'all',
}: {
  scope?: 'all' | 'project' | 'general' | 'strategic'
}) {
  const { user, can } = useAuth()
  // Defence in depth only: the backend decides what each role may receive.
  const canStrategic = can('strategicEnquiries')
  const base = scope === 'strategic' ? '/admin/strategic-enquiries' : '/admin/enquiries'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<EnquiryType | 'all'>('all')
  const [status, setStatus] = useState<EnquiryStatus | 'all'>('all')
  const [priority, setPriority] = useState<Priority | 'all'>('all')
  const [discussion, setDiscussion] = useState<DiscussionType | 'all'>('all')
  const [assign, setAssign] = useState<Assign>('all')
  const [attention, setAttention] = useState<Attention>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const q = useDeferredValue(search.trim())

  // Any filter change returns to page 1.
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(1)
    }
  const params: EnquiryListParams = {
    page,
    page_size: PAGE_SIZE,
    type: scope === 'all' ? (type === 'all' ? undefined : type) : scope,
    status: status === 'all' ? undefined : status,
    priority: priority === 'all' ? undefined : priority,
    unassigned: assign === 'unassigned' ? true : undefined,
    assigned_user_id: assign === 'mine' ? user?.id : undefined,
    overdue: attention === 'overdue' ? true : undefined,
    sla_breached: attention === 'sla_breached' ? true : undefined,
    discussion_type: scope === 'strategic' && discussion !== 'all' ? discussion : undefined,
    q: q || undefined,
    created_from: dayStart(from),
    created_to: dayEnd(to),
  }
  const query = useEnquiryList(params)

  // The API has no sort parameter: sorting applies to the current page only.
  const rows = useMemo(() => {
    const out = [...hideRestricted(query.data?.rows ?? [], canStrategic || scope === 'strategic')]
    return out.sort((a, b) =>
      sort === 'name'
        ? (a.contact_name ?? '').localeCompare(b.contact_name ?? '')
        : sort === 'oldest'
          ? a.created_at.localeCompare(b.created_at)
          : b.created_at.localeCompare(a.created_at),
    )
  }, [query.data, sort, canStrategic, scope])

  const columns: Column<EnquiryRow>[] = [
    {
      header: 'Reference',
      cell: (r) => (
        <Link to={`${base}/${r.id}`} className="font-medium text-coral-ink underline">
          {r.reference_number}
        </Link>
      ),
    },
    {
      header: 'Contact',
      cell: (r) => (
        <div className="min-w-0">
          <p>{r.contact_name ?? '—'}</p>
          <p className="break-all text-xs text-muted">{r.contact_email ?? ''}</p>
        </div>
      ),
    },
    { header: 'Organization', cell: (r) => r.company_name ?? '—' },
    { header: 'Type', cell: (r) => humanize(r.enquiry_type) },
    { header: 'Subject', cell: (r) => <span className="line-clamp-2">{r.subject ?? '—'}</span> },
    { header: 'Priority', cell: (r) => <PriorityBadge priority={r.priority as Priority} /> },
    { header: 'Status', cell: (r) => <EnquiryStatusBadge status={r.status} /> },
    {
      header: 'Assigned',
      cell: (r) =>
        r.assigned_user_id
          ? r.assigned_user_id === user?.id
            ? 'Me'
            : shortId(r.assigned_user_id)
          : 'Unassigned',
    },
    { header: 'Next follow-up', cell: (r) => formatDate(r.next_follow_up_at) },
    { header: 'Submitted', cell: (r) => formatDate(r.created_at) },
    {
      header: 'Action',
      cell: (r) => (
        <Button asChild variant="secondary" size="sm">
          <Link to={`${base}/${r.id}`} aria-label={`View enquiry ${r.reference_number}`}>
            View
          </Link>
        </Button>
      ),
    },
  ]

  const loaded = query.data?.rows.length ?? 0
  return (
    <>
      <PageHeader
        title={TITLE[scope]}
        description={
          scope === 'strategic'
            ? 'Confidential strategic, merger and integration enquiries. Access is enforced by the backend.'
            : 'Business and project enquiries from the Public Portal.'
        }
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to={`${base}/overview`}>Overview</Link>
            </Button>
            <Button variant="secondary" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw
                className={query.isFetching ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden
              />
              Refresh
            </Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1">
            <SearchInput
              value={search}
              onChange={reset(setSearch)}
              label="Search reference, name, email or company"
            />
          </div>
          {scope === 'all' && (
            <FilterDropdown<EnquiryType | 'all'>
              label="Enquiry type"
              value={type}
              onChange={reset(setType)}
              options={[
                { value: 'all', label: 'All types' },
                ...visibleEnquiryTypes(canStrategic).map((t) => ({
                  value: t,
                  label: humanize(t),
                })),
              ]}
            />
          )}
          <FilterDropdown<EnquiryStatus | 'all'>
            label="Status"
            value={status}
            onChange={reset(setStatus)}
            options={[
              { value: 'all', label: 'All statuses' },
              ...ENQUIRY_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
            ]}
          />
          {scope === 'strategic' && (
            <FilterDropdown<DiscussionType | 'all'>
              label="Discussion type"
              value={discussion}
              onChange={reset(setDiscussion)}
              options={[
                { value: 'all', label: 'All discussion types' },
                ...DISCUSSION_TYPES.map((s) => ({ value: s, label: humanize(s) })),
              ]}
            />
          )}
          <FilterDropdown<Priority | 'all'>
            label="Priority"
            value={priority}
            onChange={reset(setPriority)}
            options={[
              { value: 'all', label: 'All priorities' },
              ...PRIORITIES.map((s) => ({ value: s, label: humanize(s) })),
            ]}
          />
          <FilterDropdown<Assign>
            label="Assignment"
            value={assign}
            onChange={reset(setAssign)}
            options={[
              { value: 'all', label: 'Any assignee' },
              { value: 'unassigned', label: 'Unassigned' },
              { value: 'mine', label: 'Assigned to me' },
            ]}
          />
          <FilterDropdown<Attention>
            label="Attention"
            value={attention}
            onChange={reset(setAttention)}
            options={[
              { value: 'all', label: 'No attention filter' },
              { value: 'overdue', label: 'Overdue follow-up' },
              { value: 'sla_breached', label: 'First response missed' },
            ]}
          />
          <FilterDropdown<Sort>
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'name', label: 'Contact A–Z' },
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
          Search, type, status, priority, assignment, dates and attention filters run on the server.
          Sorting applies to the current page only (no sort parameter in the API). Phone, project
          type and last-updated are not on the list response; open an enquiry for details.
        </p>
        {query.isPending ? (
          <div className="space-y-2 p-4" role="status" aria-label="Loading enquiries">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-surface" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState message={toAppError(query.error).message} onRetry={() => query.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              emptyTitle={loaded ? 'No enquiries match your filters' : 'No enquiries found'}
            />
            <Pagination
              page={page}
              pageCount={pageCount(query.data.meta, page, PAGE_SIZE, loaded)}
              onChange={setPage}
            />
          </>
        )}
      </Card>
    </>
  )
}
