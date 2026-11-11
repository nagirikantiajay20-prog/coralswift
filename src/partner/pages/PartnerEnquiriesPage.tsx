import { Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Select } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { errText, field, human, when } from '../components/Panel'
import { partnerDashboardService as s } from '../services/partnerDashboardService'

const PAGE_SIZE = 10

/**
 * Read-only enquiry history. GET /partner/enquiries (PartnerEnquiryOut: reference_number,
 * enquiry_type, status, submitted_at) takes no query parameters and the spec has no detail,
 * create or reply endpoint for partners, so search/filter/paging run over the full returned list.
 */
export default function PartnerEnquiriesPage() {
  const pid = useAuthStore((st) => st.partner?.id)
  const q = useQuery({
    queryKey: ['partner', pid, 'enquiries'],
    queryFn: s.enquiries,
    enabled: !!pid,
    retry: 1,
  })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const rows = useMemo(() => q.data ?? [], [q.data])
  const statuses = useMemo(
    () => [...new Set(rows.map((r) => field(r, ['status'])).filter(Boolean) as string[])],
    [rows],
  )
  const shown = useMemo(() => {
    const t = search.trim().toLowerCase()
    return rows
      .filter((r) => !status || field(r, ['status']) === status)
      .filter(
        (r) =>
          !t ||
          [field(r, ['reference_number']), field(r, ['enquiry_type'])]
            .join(' ')
            .toLowerCase()
            .includes(t),
      )
      .sort((a, b) =>
        (field(b, ['submitted_at']) ?? '').localeCompare(field(a, ['submitted_at']) ?? ''),
      )
  }, [rows, search, status])
  const pageCount = Math.ceil(shown.length / PAGE_SIZE)
  const current = Math.min(page, Math.max(pageCount, 1))
  const visible = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Enquiries</h1>
        <p className="text-sm text-muted">
          Your organization&apos;s origin enquiry and the enquiries you submitted.
        </p>
      </div>
      {q.isLoading ? (
        <div role="status" aria-label="Loading enquiries" className="h-24 animate-pulse rounded bg-surface" />
      ) : q.isError ? (
        <ErrorState message={errText(q.error)} onRetry={() => q.refetch()} />
      ) : !rows.length ? (
        <EmptyState title="No enquiries" description="Enquiries linked to your account will appear here." icon={Inbox} />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-56 flex-1">
              <SearchInput
                label="Search enquiries"
                value={search}
                onChange={(v) => {
                  setSearch(v)
                  setPage(1)
                }}
              />
            </div>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All statuses</option>
              {statuses.map((x) => (
                <option key={x} value={x}>
                  {human(x)}
                </option>
              ))}
            </Select>
          </div>
          {!shown.length ? (
            <EmptyState title="No matching enquiries" icon={Inbox} />
          ) : (
            <div className="rounded-lg border border-line bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-muted">
                  <tr>
                    <th className="p-3 font-medium">Reference</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((r, i) => (
                    <tr key={field(r, ['reference_number']) ?? i}>
                      <td className="p-3">{field(r, ['reference_number']) ?? '—'}</td>
                      <td className="p-3">{human(field(r, ['enquiry_type']) ?? '—')}</td>
                      <td className="p-3">
                        <StatusBadge label={human(field(r, ['status']) ?? '—')} tone="neutral" />
                      </td>
                      <td className="p-3">{when(field(r, ['submitted_at']))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={current} pageCount={pageCount} onChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
