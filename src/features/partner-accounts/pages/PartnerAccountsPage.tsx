import { ShieldQuestion } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorState, LoadingState } from '@/components/common/states'
import { Card } from '@/components/ui/card'
import {
  formatDate,
  humanize,
  pageCount,
  shortId,
} from '@/features/partner-applications/utils/format'
import { usePartnerList } from '@/features/partner-management/hooks/usePartners'
import type { OrgRow, OrgStatus } from '@/features/partner-management/types'
import { STATUS_TONE } from '@/features/partner-management/utils/partners'
import { toAppError } from '@/services/api/errors'
import { AccountsDirectory } from '../components/AccountsDirectory'
import { CAPABILITIES, inOnboarding } from '../utils/accounts'

const PAGE_SIZE = 20
export default function PartnerAccountsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrgStatus | 'all'>('all')
  const q = usePartnerList({
    q: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
    page,
    page_size: PAGE_SIZE,
  })
  const rows = q.data?.rows ?? []

  const columns: Column<OrgRow>[] = [
    {
      header: 'Partner ID',
      cell: (r) => <span className="font-mono text-xs">{shortId(r.id)}</span>,
    },
    {
      header: 'Organization',
      cell: (r) => (
        <Link
          to={`/admin/partner-accounts/${r.id}`}
          className="font-medium text-coral-ink hover:underline"
        >
          {r.legal_name}
        </Link>
      ),
    },
    {
      header: 'Partnership',
      cell: (r) => (
        <StatusBadge label={humanize(r.status)} tone={STATUS_TONE[r.status] ?? 'neutral'} />
      ),
    },
    {
      header: 'Open application',
      cell: (r) => (r.open_application_status ? humanize(r.open_application_status) : '—'),
    },
    {
      header: 'Provisioning stage',
      cell: (r) =>
        inOnboarding(r.open_application_status) ? (
          <StatusBadge label="Onboarding reached" tone="success" />
        ) : (
          <StatusBadge label="Not reached" tone="neutral" />
        ),
    },
    { header: 'Created', cell: (r) => formatDate(r.created_at) },
  ]

  return (
    <>
      <PageHeader
        title="Partner Accounts"
        description="Partner Portal access. Accounts are invitation-only; the account directory below is read-only."
      />
      <div role="note" className="mb-4 rounded border border-line bg-surface p-3 text-sm">
        <ShieldQuestion className="mr-2 inline size-4" aria-hidden />
        The account directory lists real partner accounts from the backend. The table further down
        lists <b>partner organizations</b> so an authorised administrator can open one and provision
        access. Approval and onboarding never create an account automatically.
      </div>
      <AccountsDirectory />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-56 flex-1">
            <SearchInput
              label="Search partner organizations"
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
        </div>
        <p className="px-4 pb-2 text-xs text-muted">Server-side search, status and pagination.</p>
        {q.isPending ? (
          <LoadingState label="Loading partner organizations…" />
        ) : q.isError ? (
          <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              emptyTitle={
                search || status !== 'all' ? 'No partners match these filters' : 'No partners yet'
              }
            />
            <Pagination
              page={page}
              pageCount={pageCount(q.data.meta, page, PAGE_SIZE, rows.length)}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">
          Backend support (verified against openapi.json, 2026-11-10)
        </h2>
        <ul className="divide-y divide-line text-sm">
          {CAPABILITIES.map((c) => (
            <li key={c.operation} className="flex flex-wrap items-start gap-3 py-2">
              <StatusBadge
                label={c.support === 'verified' ? 'Supported' : 'Not available'}
                tone={c.support === 'verified' ? 'success' : 'warning'}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.operation}</p>
                <p className="text-muted">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
