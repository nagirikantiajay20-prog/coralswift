import { RefreshCw } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DatePicker } from '@/components/forms/inputs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { FollowUpDialog } from '@/features/business-enquiries/components/EnquiryActions'
import { useEnquiryDetail, useEnquiryList } from '@/features/business-enquiries/hooks/useEnquiries'
import type {
  EnquiryListParams,
  EnquiryRow,
  EnquiryType,
} from '@/features/business-enquiries/types'
import {
  formatDate,
  humanize,
  pageCount,
  shortId,
} from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { FollowUpList } from '../components/FollowUpList'
import {
  groupByDay,
  hideRestricted,
  inDayRange,
  isRowOverdue,
  recordPath,
  type RecordKind,
  visibleEnquiryTypes,
} from '../utils/followUps'

const PAGE_SIZE = 50
type View = 'upcoming' | 'overdue' | 'all'
type Owner = 'any' | 'me' | 'unassigned'

function Expanded({ row }: { row: EnquiryRow }) {
  const q = useEnquiryDetail(row.id)
  if (q.isPending) return <LoadingState label="Loading follow-ups…" />
  if (q.isError)
    return <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
  return <FollowUpList enquiryId={row.id} items={q.data.follow_ups} />
}

/**
 * The backend has NO global follow-up list: follow-ups live under each enquiry. This page lists
 * enquiries that have a next follow-up date (server-paginated) grouped by day, and loads the full
 * follow-up list of a record on demand. A calendar is not offered: only ONE date per enquiry
 * (`next_follow_up_at`) is available, so a calendar would be incomplete.
 */
export default function FollowUpsPage() {
  const { user, can } = useAuth()
  const canStrategic = can('strategicEnquiries')
  const [view, setView] = useState<View>('upcoming')
  const [owner, setOwner] = useState<Owner>('any')
  const [type, setType] = useState<EnquiryType | 'all'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const q = useDeferredValue(search.trim())
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(1)
    }

  const params: EnquiryListParams = {
    page,
    page_size: PAGE_SIZE,
    type: type === 'all' ? undefined : type,
    overdue: view === 'overdue' ? true : undefined,
    unassigned: owner === 'unassigned' ? true : undefined,
    assigned_user_id: owner === 'me' ? user?.id : undefined,
    q: q || undefined,
  }
  const query = useEnquiryList(params)
  const [now] = useState(Date.now)
  const loaded = query.data?.rows ?? []

  const { groups, shown } = (() => {
    const rows = hideRestricted(loaded, canStrategic).filter(
      (r) =>
        !!r.next_follow_up_at &&
        inDayRange(r.next_follow_up_at, from, to) &&
        (view === 'all' ||
          (view === 'overdue'
            ? isRowOverdue(r, now)
            : r.status !== 'closed' && !isRowOverdue(r, now))),
    )
    return { groups: groupByDay(rows), shown: rows.length }
  })()

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description="Enquiries with a scheduled follow-up, grouped by due date."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/admin/discussions">Discussions</Link>
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
      <p className="mb-4 rounded-md border border-line bg-warm p-3 text-sm" role="note">
        Follow-ups are internal staff tasks. Supported: create, complete. Not supported by the
        backend: cancel, reschedule, reassign a follow-up (the owner is the enquiry&apos;s
        assignee), a global completed list, and follow-up reminders or notifications. Partner
        applications have no follow-up concept.
      </p>
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1">
            <SearchInput
              value={search}
              onChange={reset(setSearch)}
              label="Search reference, name, email or company"
            />
          </div>
          <FilterDropdown<View>
            label="View"
            value={view}
            onChange={reset(setView)}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'all', label: 'All with a follow-up date' },
            ]}
          />
          <FilterDropdown<Owner>
            label="Enquiry owner"
            value={owner}
            onChange={reset(setOwner)}
            options={[
              { value: 'any', label: 'Any owner' },
              { value: 'me', label: 'Assigned to me' },
              { value: 'unassigned', label: 'Unassigned' },
            ]}
          />
          <FilterDropdown<EnquiryType | 'all'>
            label="Record type"
            value={type}
            onChange={reset(setType)}
            options={[
              { value: 'all', label: 'All types' },
              ...visibleEnquiryTypes(canStrategic).map((t) => ({ value: t, label: humanize(t) })),
            ]}
          />
          <label className="text-xs text-muted">
            Due from
            <DatePicker value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            to
            <DatePicker value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <p className="border-b border-line px-4 py-2 text-xs text-muted">
          Overdue, owner, type and search run on the server. Upcoming and the due-date range apply
          to the {loaded.length} enquiries on this page (the API cannot filter by follow-up date).
        </p>
        {query.isPending ? (
          <LoadingState label="Loading follow-ups…" />
        ) : query.isError ? (
          <ErrorState message={toAppError(query.error).message} onRetry={() => query.refetch()} />
        ) : shown === 0 ? (
          <EmptyState title="No follow-ups match your filters" />
        ) : (
          groups.map((g) => (
            <section key={g.day} aria-label={g.day} className="border-b border-line last:border-0">
              <h2 className="bg-surface px-4 py-2 text-xs font-semibold uppercase text-muted">
                {formatDate(`${g.day}T12:00:00`)}
              </h2>
              <ul>
                {g.rows.map((r) => (
                  <li key={r.id} className="border-t border-line p-4 first:border-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={recordPath(r.enquiry_type as RecordKind, r.id)}
                        className="font-medium text-coral-ink underline"
                      >
                        {r.reference_number}
                      </Link>
                      <StatusBadge label={humanize(r.enquiry_type)} />
                      {isRowOverdue(r) ? (
                        <StatusBadge label="Overdue" tone="danger" />
                      ) : (
                        <StatusBadge
                          label={r.status === 'closed' ? 'Closed' : 'Upcoming'}
                          tone={r.status === 'closed' ? 'neutral' : 'info'}
                        />
                      )}
                      <span className="text-sm text-muted">
                        {r.company_name ?? r.contact_name ?? '—'} · owner{' '}
                        {r.assigned_user_id
                          ? r.assigned_user_id === user?.id
                            ? 'me'
                            : shortId(r.assigned_user_id)
                          : 'unassigned'}
                      </span>
                      <span className="flex-1" />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setOpen(open === r.id ? null : r.id)}
                      >
                        {open === r.id ? 'Hide follow-ups' : 'View follow-ups'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setAdding(r.id)}>
                        Add follow-up
                      </Button>
                    </div>
                    {open === r.id && (
                      <div className="mt-3">
                        <Expanded row={r} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        {!query.isPending && !query.isError && (
          <Pagination
            page={page}
            pageCount={pageCount(query.data?.meta ?? null, page, PAGE_SIZE, loaded.length)}
            onChange={setPage}
          />
        )}
      </Card>
      {adding && <FollowUpDialog id={adding} onClose={() => setAdding(null)} />}
    </>
  )
}
