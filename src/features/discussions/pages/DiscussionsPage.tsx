import { RefreshCw } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { ErrorState } from '@/components/common/states'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { EnquiryStatusBadge } from '@/features/business-enquiries/components/EnquiryBadges'
import { useEnquiryList } from '@/features/business-enquiries/hooks/useEnquiries'
import {
  ENQUIRY_STATUSES,
  type EnquiryListParams,
  type EnquiryRow,
  type EnquiryStatus,
  type EnquiryType,
} from '@/features/business-enquiries/types'
import { useDiscussionMetrics } from '@/features/follow-ups/hooks/useFollowUps'
import type { Metric } from '@/features/follow-ups/services/followUpsService'
import { hideRestricted, visibleEnquiryTypes } from '@/features/follow-ups/utils/followUps'
import { useApplicationList } from '@/features/partner-applications/hooks/useApplications'
import type { ReviewerApplication } from '@/features/partner-applications/types'
import {
  formatDate,
  humanize,
  pageCount,
  shortId,
  STATUS_TONE,
} from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { ApplicationThread, EnquiryThread } from '../components/Threads'
import {
  CalendarClock,
  CheckCheck,
  ClipboardList,
  Hourglass,
  Inbox,
  MessageSquare,
} from 'lucide-react'

const PAGE_SIZE = 20
type Tab = 'enquiries' | 'applications'

const metric = (m?: Metric) => ({ value: m?.value, error: m?.failed })

function Loading({ label }: { label: string }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-surface" />
      ))}
    </div>
  )
}

export default function DiscussionsPage() {
  const { user, can } = useAuth()
  const canStrategic = can('strategicEnquiries')
  const canApps = can('applications')
  const [tab, setTab] = useState<Tab>('enquiries')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<EnquiryType | 'all'>('all')
  const [status, setStatus] = useState<EnquiryStatus | 'all'>('all')
  const [mine, setMine] = useState(false)
  const [awaiting, setAwaiting] = useState(false)
  const [enq, setEnq] = useState<EnquiryRow | null>(null)
  const [app, setApp] = useState<ReviewerApplication | null>(null)
  const q = useDeferredValue(search.trim())
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(1)
    }

  const metrics = useDiscussionMetrics(canStrategic, canApps)
  const params: EnquiryListParams = {
    page,
    page_size: PAGE_SIZE,
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
    assigned_user_id: mine ? user?.id : undefined,
    q: q || undefined,
  }
  const enquiries = useEnquiryList(params, tab === 'enquiries')
  const applications = useApplicationList({
    page,
    page_size: PAGE_SIZE,
    status: awaiting ? 'information_requested' : undefined,
  })

  const enquiryColumns: Column<EnquiryRow>[] = [
    { header: 'Reference', cell: (r) => <span className="font-medium">{r.reference_number}</span> },
    { header: 'Type', cell: (r) => <StatusBadge label={humanize(r.enquiry_type)} /> },
    {
      header: 'Applicant / organization',
      cell: (r) => r.company_name ?? r.contact_name ?? '—',
    },
    { header: 'Subject', cell: (r) => <span className="line-clamp-2">{r.subject ?? '—'}</span> },
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
        <Button
          size="sm"
          variant="secondary"
          aria-label={`Open thread ${r.reference_number}`}
          onClick={() => setEnq(r)}
        >
          Open thread
        </Button>
      ),
    },
  ]
  const appColumns: Column<ReviewerApplication>[] = [
    { header: 'Reference', cell: (r) => <span className="font-medium">{r.reference}</span> },
    { header: 'Type', cell: () => <StatusBadge label="Partner application" /> },
    { header: 'Organization', cell: (r) => r.organization_name ?? '—' },
    {
      header: 'Status',
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge label={humanize(r.status)} tone={STATUS_TONE[r.status] ?? 'neutral'} />
          {r.status === 'information_requested' && (
            <StatusBadge label="Awaiting partner reply" tone="warning" />
          )}
        </div>
      ),
    },
    {
      header: 'Reviewer',
      cell: (r) => (r.assigned_reviewer_id ? shortId(r.assigned_reviewer_id) : 'Unassigned'),
    },
    { header: 'Submitted', cell: (r) => formatDate(r.submitted_at) },
    {
      header: 'Action',
      cell: (r) => (
        <Button
          size="sm"
          variant="secondary"
          aria-label={`Open thread ${r.reference}`}
          onClick={() => setApp(r)}
        >
          Open thread
        </Button>
      ),
    },
  ]

  const active = tab === 'enquiries' ? enquiries : applications
  const eRows = hideRestricted(enquiries.data?.rows ?? [], canStrategic)
  const aRows = applications.data?.rows ?? []
  const got = tab === 'enquiries' ? (enquiries.data?.rows.length ?? 0) : aRows.length
  const m = metrics.data

  return (
    <>
      <PageHeader
        title="Discussions"
        description="Internal notes and communication history per record. Each record type keeps its own workflow."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/admin/follow-ups">Follow-ups</Link>
            </Button>
            <Button
              variant="secondary"
              onClick={() => active.refetch()}
              disabled={active.isFetching}
            >
              <RefreshCw
                className={active.isFetching ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden
              />
              Refresh
            </Button>
          </>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Enquiry records"
          icon={Inbox}
          loading={metrics.isPending}
          {...metric(m?.total)}
          error={metrics.isError || m?.total.failed}
        />
        <StatCard
          label="Open enquiries"
          icon={MessageSquare}
          loading={metrics.isPending}
          {...metric(m?.open)}
          error={metrics.isError || m?.open.failed}
          hint="Received + in review"
        />
        <StatCard
          label="Overdue follow-ups"
          icon={CalendarClock}
          loading={metrics.isPending}
          {...metric(m?.overdue)}
          error={metrics.isError || m?.overdue.failed}
          hint="Enquiries past their follow-up date"
        />
        {canApps ? (
          <StatCard
            label="Pending partner responses"
            icon={Hourglass}
            loading={metrics.isPending}
            {...metric(m?.pendingResponses)}
            error={metrics.isError || m?.pendingResponses.failed}
            hint="Applications awaiting information"
          />
        ) : (
          <StatCard label="Pending responses" icon={Hourglass} hint="Application access required" />
        )}
        <StatCard
          label="Upcoming follow-ups"
          icon={ClipboardList}
          hint="Not supported: no backend filter or count"
        />
        <StatCard
          label="Completed follow-ups"
          icon={CheckCheck}
          hint="Not supported: no global follow-up list"
        />
        <StatCard
          label="Recently updated"
          icon={Inbox}
          hint="Not supported: no updated-at in the API"
        />
        <StatCard
          label="Total discussions"
          icon={MessageSquare}
          hint="Not supported: no discussion list; see enquiry records"
        />
      </div>
      <p className="mb-4 rounded-md border border-line bg-warm p-3 text-sm" role="note">
        <strong>Internal vs external.</strong> Notes and follow-ups are internal staff records and
        are never presented as messages to applicants. The backend has no notification or message
        delivery for these entries, and no delivery is claimed.
      </p>

      {enq && <EnquiryThread key={enq.id} row={enq} onClose={() => setEnq(null)} />}
      {app && <ApplicationThread key={app.id} app={app} onClose={() => setApp(null)} />}

      <Card>
        <div
          role="tablist"
          aria-label="Record type"
          className="flex gap-2 border-b border-line p-3"
        >
          {(
            [
              ['enquiries', 'Enquiries'],
              ...(canApps ? [['applications', 'Partner Applications']] : []),
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <Button
              key={k}
              role="tab"
              aria-selected={tab === k}
              variant={tab === k ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setTab(k)
                setPage(1)
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          {tab === 'enquiries' ? (
            <>
              <div className="min-w-56 flex-1">
                <SearchInput
                  value={search}
                  onChange={reset(setSearch)}
                  label="Search reference, name, email or company"
                />
              </div>
              <FilterDropdown<EnquiryType | 'all'>
                label="Record type"
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
              <FilterDropdown<EnquiryStatus | 'all'>
                label="Status"
                value={status}
                onChange={reset(setStatus)}
                options={[
                  { value: 'all', label: 'All statuses' },
                  ...ENQUIRY_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
                ]}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mine}
                  onChange={(e) => reset(setMine)(e.target.checked)}
                />
                Assigned to me
              </label>
            </>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={awaiting}
                onChange={(e) => reset(setAwaiting)(e.target.checked)}
              />
              Awaiting partner reply only
            </label>
          )}
        </div>
        <p className="border-b border-line px-4 py-2 text-xs text-muted">
          Last activity is not returned by the list API; open a thread for its entries. Filters run
          on the server.
        </p>
        {active.isPending ? (
          <Loading label="Loading records" />
        ) : active.isError ? (
          <ErrorState message={toAppError(active.error).message} onRetry={() => active.refetch()} />
        ) : tab === 'enquiries' ? (
          <DataTable
            columns={enquiryColumns}
            rows={eRows}
            rowKey={(r) => r.id}
            emptyTitle="No enquiries match your filters"
          />
        ) : (
          <DataTable
            columns={appColumns}
            rows={aRows}
            rowKey={(r) => r.id}
            emptyTitle="No partner applications match your filters"
          />
        )}
        {!active.isPending && !active.isError && (
          <Pagination
            page={page}
            pageCount={pageCount(active.data?.meta ?? null, page, PAGE_SIZE, got)}
            onChange={setPage}
          />
        )}
      </Card>
    </>
  )
}
