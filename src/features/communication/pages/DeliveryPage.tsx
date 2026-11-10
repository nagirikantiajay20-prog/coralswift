import { RefreshCw, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { canAccess } from '@/config/permissions'
import {
  formatDateTime,
  humanize,
  pageCount,
  shortId,
} from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'
import { useDispatch, useOutbox, useRetry } from '../hooks/useCommunication'
import { DELIVERY_STATUSES, type DeliveryStatus } from '../types'
import {
  canRetry,
  filterDeliveries,
  STATUS_LABEL,
  STATUS_TONE,
  toDeliveries,
  type Delivery,
} from '../utils/communication'

const PAGE_SIZE = 20

export default function DeliveryPage() {
  const role = useAuthStore((s) => s.user?.role)
  const canSeeStrategic = canAccess(role, 'strategicEnquiries')
  const [status, setStatus] = useState<DeliveryStatus>('failed')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [retrying, setRetrying] = useState<Delivery | null>(null)
  const [confirmDispatch, setConfirmDispatch] = useState(false)
  const q = useOutbox({ status, page, page_size: PAGE_SIZE })
  const retry = useRetry()
  const dispatch = useDispatch()
  const all = useMemo(
    () => toDeliveries(q.data?.rows ?? [], canSeeStrategic),
    [q.data, canSeeStrategic],
  )
  const rows = filterDeliveries(all, search)

  const columns: Column<Delivery>[] = [
    {
      header: 'Reference',
      cell: (r) => <span className="font-mono text-xs">{shortId(r.id)}</span>,
    },
    { header: 'Type', cell: (r) => (r.type ? humanize(r.type) : '—') },
    {
      header: 'Recipient',
      cell: (r) => (r.restricted ? <i className="text-muted">Restricted</i> : (r.recipient ?? '—')),
    },
    {
      header: 'Subject',
      cell: (r) => (r.restricted ? <i className="text-muted">Restricted</i> : (r.subject ?? '—')),
    },
    { header: 'Created', cell: (r) => formatDateTime(r.createdAt) },
    {
      header: 'Status',
      cell: (r) =>
        r.status ? (
          <StatusBadge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} />
        ) : (
          '—'
        ),
    },
    { header: 'Attempts', cell: (r) => r.attempts ?? '—' },
    {
      header: 'Failure reason',
      cell: (r) => (r.restricted ? <i className="text-muted">Restricted</i> : (r.failure ?? '—')),
    },
    {
      header: 'Action',
      cell: (r) =>
        canRetry(r) ? (
          <Button size="sm" variant="secondary" onClick={() => setRetrying(r)}>
            <RefreshCw className="size-3.5" aria-hidden /> Retry
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <PageHeader
        title="Delivery tracking"
        description="Email outbox from the backend. “Sent” means accepted by the provider, not confirmed delivered."
        actions={
          <Button
            variant="secondary"
            onClick={() => setConfirmDispatch(true)}
            disabled={dispatch.isPending}
          >
            <Send className="size-4" aria-hidden /> Retry eligible emails now
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <FilterDropdown
            label="Delivery status"
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            options={DELIVERY_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          />
          <div className="min-w-56 flex-1">
            <SearchInput label="Filter this page" value={search} onChange={setSearch} />
          </div>
        </div>
        <p className="px-4 pb-2 text-xs text-muted">
          Status and pagination are server-side. The text filter applies to the loaded page only.
          Date-range and type filters, related-record links and body content are not exposed by the
          backend.
        </p>
        {q.isPending ? (
          <LoadingState label="Loading deliveries…" />
        ) : q.isError ? (
          <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              emptyTitle={
                search
                  ? 'No emails match this filter'
                  : `No ${STATUS_LABEL[status].toLowerCase()} emails`
              }
            />
            <Pagination
              page={page}
              pageCount={pageCount(q.data.meta, page, PAGE_SIZE, q.data.rows.length)}
              onChange={setPage}
            />
          </>
        )}
      </Card>
      <ConfirmDialog
        open={retrying !== null}
        onOpenChange={(o) => !o && setRetrying(null)}
        title="Retry this email?"
        description="The failed email is reset so the backend attempts it again. This does not guarantee delivery."
        confirmLabel="Retry"
        onConfirm={() => retrying && retry.mutate(retrying.id)}
      />
      <ConfirmDialog
        open={confirmDispatch}
        onOpenChange={setConfirmDispatch}
        title="Retry all eligible emails?"
        description="The backend retries eligible emails in the background. Rows past the retry cap still need an individual retry."
        confirmLabel="Dispatch"
        onConfirm={() => dispatch.mutate()}
      />
    </>
  )
}
