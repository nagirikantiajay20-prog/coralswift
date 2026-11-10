import { useQuery } from '@tanstack/react-query'
import { Building2, CheckCircle2, Hourglass, PauseCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorState, LoadingState } from '@/components/common/states'
import { DatePicker } from '@/components/forms/inputs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { partnerApplicationsService } from '@/features/partner-applications/services/partnerApplicationsService'
import {
  formatDate,
  humanize,
  pageCount,
  shortId,
} from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { usePartnerList, usePartnerTotal } from '../hooks/usePartners'
import type { OrgRow, OrgStatus } from '../types'
import { countriesOf, metaTotal, refine, sortRows, STATUS_TONE, type Sort } from '../utils/partners'

const PAGE_SIZE = 20

export default function PartnersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrgStatus | 'all'>('all')
  const [country, setCountry] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<Sort>('newest')

  // Server-side: q, status, page. Country, date and sort refine the loaded page only.
  const q = usePartnerList({
    q: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
    page,
    page_size: PAGE_SIZE,
  })
  const total = usePartnerTotal()
  const active = usePartnerTotal('active')
  const suspended = usePartnerTotal('suspended')
  // Applications (not partners) at the onboarding stage: shown under its own, accurate label.
  const onboarding = useQuery({
    queryKey: ['partners', 'onboarding-applications'],
    queryFn: async () =>
      metaTotal(
        (
          await partnerApplicationsService.list({
            status: 'pilot_onboarding',
            page: 1,
            page_size: 1,
          })
        ).meta,
      ) ?? null,
    retry: false,
  })

  const loaded = useMemo(() => q.data?.rows ?? [], [q.data])
  const rows = useMemo(
    () => sortRows(refine(loaded, { country, from, to }), sort),
    [loaded, country, from, to, sort],
  )
  const filtered = !!(search || status !== 'all' || country || from || to)
  const clear = () => {
    setSearch('')
    setStatus('all')
    setCountry('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  const columns: Column<OrgRow>[] = [
    {
      header: 'Reference',
      cell: (r) => <span className="font-mono text-xs">{shortId(r.id)}</span>,
    },
    {
      header: 'Organization',
      cell: (r) => (
        <Link to={`/admin/partners/${r.id}`} className="font-medium text-coral-ink hover:underline">
          {r.legal_name}
        </Link>
      ),
    },
    { header: 'Country', cell: (r) => r.country ?? '—' },
    {
      header: 'Partnership status',
      cell: (r) => (
        <StatusBadge label={humanize(r.status)} tone={STATUS_TONE[r.status] ?? 'neutral'} />
      ),
    },
    {
      header: 'Open application stage',
      cell: (r) => (r.open_application_status ? humanize(r.open_application_status) : '—'),
    },
    { header: 'Created', cell: (r) => formatDate(r.created_at) },
  ]

  const stat = (query: typeof total) => ({
    value: query.data ?? undefined,
    loading: query.isPending,
    error: query.isError,
  })

  return (
    <>
      <PageHeader
        title="All Partners"
        description="Partner organizations. Approved applicants are not partners until the backend lists them here."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total partners" icon={Building2} {...stat(total)} />
        <StatCard label="Active partners" icon={CheckCircle2} {...stat(active)} />
        <StatCard label="Suspended partners" icon={PauseCircle} {...stat(suspended)} />
        <StatCard
          label="Applications in onboarding"
          icon={Hourglass}
          hint="Applications (not partners) at pilot_onboarding"
          {...stat(onboarding as typeof total)}
        />
      </div>
      <p className="mb-4 text-xs text-muted">
        Not available from the backend: category, recently-onboarded and per-category metrics.
        Totals use the backend&apos;s list total and show &quot;—&quot; when it is not returned.
      </p>

      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-56 flex-1">
            <SearchInput
              label="Search partners"
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
            />
          </div>
          <FilterDropdown
            label="Partnership status"
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
          <FilterDropdown
            label="Country (this page)"
            value={country}
            onChange={setCountry}
            options={[
              { value: '', label: 'All countries' },
              ...countriesOf(loaded).map((c) => ({ value: c, label: c })),
            ]}
          />
          <DatePicker
            aria-label="Created from (this page)"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <DatePicker
            aria-label="Created to (this page)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <FilterDropdown
            label="Sort (this page)"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'oldest', label: 'Oldest' },
              { value: 'name', label: 'Name A–Z' },
            ]}
          />
          {filtered && (
            <Button variant="secondary" size="sm" onClick={clear}>
              Clear filters
            </Button>
          )}
        </div>
        <p className="px-4 pb-2 text-xs text-muted">
          Search and status filter on the server. Country, date and sort apply to the loaded page
          only.
        </p>
        {q.isPending ? (
          <LoadingState label="Loading partners…" />
        ) : q.isError ? (
          <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              emptyTitle={filtered ? 'No partners match these filters' : 'No partners yet'}
            />
            <Pagination
              page={page}
              pageCount={pageCount(q.data.meta, page, PAGE_SIZE, loaded.length)}
              onChange={setPage}
            />
          </>
        )}
      </Card>
    </>
  )
}
