import { RefreshCw } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { ErrorState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DatePicker } from '@/components/forms/inputs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ENQUIRY_STATUSES, PRIORITIES } from '@/features/business-enquiries/types'
import { PRIORITY_TONE } from '@/features/business-enquiries/utils/format'
import { ConfidentialBanner } from '@/features/strategic-enquiries/components/ConfidentialBanner'
import { dayEnd, dayStart } from '@/features/dashboard/utils/transform'
import { PORTAL_STATUSES } from '@/features/partner-applications/types'
import { formatDate, humanize, pageCount } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import {
  AccessDenied,
  AssignAction,
  CountsSection,
  isForbidden,
  WorkloadSection,
} from '../components/AssignmentParts'
import {
  useCategoryCounts,
  useLeadList,
  useStaffNames,
  useWorkload,
} from '../hooks/useLeadAssignment'
import type { LeadFilters } from '../services/leadAssignmentService'
import type { AssignCategory, AssignRecord } from '../types'
import { assigneeLabel, CATEGORIES, visibleCategories } from '../utils/assignment'

const PAGE_SIZE = 20
type Assign = 'all' | 'unassigned' | 'mine' | string

export default function LeadAssignmentPage() {
  const { user, can } = useAuth()
  const isSuper = user?.role === 'super_administrator'
  const cats = visibleCategories(can)
  const keys = cats.map((c) => c.key)
  const [category, setCategory] = useState<AssignCategory>(keys[0] ?? 'general')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [assign, setAssign] = useState<Assign>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const q = useDeferredValue(search.trim())
  const names = useStaffNames(true)
  const isApps = category === 'applications'

  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(1)
    }
  // Applications API supports only status + unassigned; the other filters are not sent for it.
  const filters: LeadFilters = {
    status: status === 'all' ? undefined : status,
    unassigned: assign === 'unassigned' ? true : undefined,
    ...(isApps
      ? {}
      : {
          priority: priority === 'all' ? undefined : priority,
          assignedUserId:
            assign === 'mine'
              ? user?.id
              : ['all', 'unassigned'].includes(assign)
                ? undefined
                : assign,
          q: q || undefined,
          from: dayStart(from),
          to: dayEnd(to),
        }),
  }
  const list = useLeadList(category, filters, page, PAGE_SIZE)
  const counts = useCategoryCounts(keys, user?.id ?? '')
  const workload = useWorkload()

  const refresh = () => {
    void list.refetch()
    counts.forEach((c) => void c.refetch())
    void workload.refetch()
  }
  const canAssign = (r: AssignRecord) =>
    r.category === 'applications'
      ? isSuper
      : r.category === 'strategic'
        ? can('strategicEnquiries')
        : can('enquiries')

  const columns: Column<AssignRecord>[] = [
    { header: 'Reference', cell: (r) => <span className="font-medium">{r.reference}</span> },
    { header: 'Type', cell: (r) => CATEGORIES.find((c) => c.key === r.category)?.label },
    {
      header: 'Applicant / organization',
      cell: (r) => (
        <div className="min-w-0">
          <p>{r.organization ?? r.contactName ?? '—'}</p>
          {r.contactName && r.organization && <p className="text-xs text-muted">{r.contactName}</p>}
          {r.contactEmail && <p className="break-all text-xs text-muted">{r.contactEmail}</p>}
        </div>
      ),
    },
    { header: 'Status', cell: (r) => <StatusBadge label={humanize(r.status)} tone="info" /> },
    {
      header: 'Priority',
      cell: (r) =>
        r.priority ? (
          <StatusBadge
            label={humanize(r.priority)}
            tone={PRIORITY_TONE[r.priority as keyof typeof PRIORITY_TONE] ?? 'neutral'}
          />
        ) : (
          '—'
        ),
    },
    { header: 'Assignee', cell: (r) => assigneeLabel(r.assigneeId, user?.id, names.data) },
    { header: 'Submitted', cell: (r) => formatDate(r.createdAt) },
    {
      header: 'Action',
      cell: (r) => <AssignAction record={r} allowed={canAssign(r)} />,
    },
  ]

  const loaded = list.data?.records.length ?? 0
  const label = CATEGORIES.find((c) => c.key === category)?.label ?? ''
  if (!cats.length) return <AccessDenied what="any assignable record type" />
  return (
    <>
      <PageHeader
        title="Lead Assignment"
        description="Assign and reassign owners across Partner Applications and enquiries. Each category is its own backend workflow."
        actions={
          <Button variant="secondary" onClick={refresh} disabled={list.isFetching}>
            <RefreshCw className={list.isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
            Refresh
          </Button>
        }
      />
      <CountsSection cats={keys} queries={counts} />

      <div role="tablist" aria-label="Record category" className="mb-3 flex flex-wrap gap-2">
        {cats.map((c) => (
          <Button
            key={c.key}
            role="tab"
            aria-selected={c.key === category}
            variant={c.key === category ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setCategory(c.key)
              setStatus('all')
              setPage(1)
            }}
          >
            {c.label}
          </Button>
        ))}
      </div>
      {category === 'strategic' && <ConfidentialBanner />}

      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          {!isApps && (
            <div className="min-w-56 flex-1">
              <SearchInput
                value={search}
                onChange={reset(setSearch)}
                label="Search reference, name, email or company"
              />
            </div>
          )}
          <FilterDropdown<string>
            label="Status"
            value={status}
            onChange={reset(setStatus)}
            options={[
              { value: 'all', label: 'All statuses' },
              ...(isApps ? PORTAL_STATUSES : ENQUIRY_STATUSES).map((s) => ({
                value: s,
                label: humanize(s),
              })),
            ]}
          />
          {!isApps && (
            <FilterDropdown<string>
              label="Priority"
              value={priority}
              onChange={reset(setPriority)}
              options={[
                { value: 'all', label: 'All priorities' },
                ...PRIORITIES.map((s) => ({ value: s, label: humanize(s) })),
              ]}
            />
          )}
          <FilterDropdown<string>
            label="Assignment"
            value={assign}
            onChange={reset(setAssign)}
            options={[
              { value: 'all', label: 'Any assignee' },
              { value: 'unassigned', label: 'Unassigned' },
              ...(isApps
                ? []
                : [
                    { value: 'mine', label: 'Assigned to me' },
                    ...[...(names.data ?? [])]
                      .filter(([id]) => id !== user?.id)
                      .map(([id, n]) => ({ value: id, label: n })),
                  ]),
            ]}
          />
          {!isApps && (
            <>
              <label className="text-xs text-muted">
                Submitted from
                <DatePicker value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
              </label>
              <label className="text-xs text-muted">
                to
                <DatePicker value={to} onChange={(e) => reset(setTo)(e.target.value)} />
              </label>
            </>
          )}
        </div>
        <p className="border-b border-line px-4 py-2 text-xs text-muted">
          {isApps
            ? 'The applications API filters by status and unassigned only (server-side). Search, priority, dates and assignee filters are not supported there. Contact details are not returned.'
            : 'All filters run on the server. A "any assigned" filter does not exist in the API; pick an administrator or Unassigned. The assignee list needs super administrator access. The API returns no last-updated date.'}
        </p>
        {list.isPending ? (
          <div className="space-y-2 p-4" role="status" aria-label={`Loading ${label}`}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-surface" />
            ))}
          </div>
        ) : list.isError ? (
          isForbidden(list.error) ? (
            <AccessDenied what={label} />
          ) : (
            <ErrorState message={toAppError(list.error).message} onRetry={() => list.refetch()} />
          )
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={list.data.records}
              rowKey={(r) => r.key}
              emptyTitle={`No ${label.toLowerCase()} match your filters`}
            />
            <Pagination
              page={page}
              pageCount={pageCount(list.data.meta, page, PAGE_SIZE, loaded)}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <WorkloadSection q={workload} />
    </>
  )
}
