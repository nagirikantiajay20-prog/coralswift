import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, humanize, pageCount } from '@/features/partner-applications/utils/format'
import { api } from '@/services/api/client'
import { toAppError } from '@/services/api/errors'

const BASE = '/api/v1/admin/documents'
export const REVIEW_STATUSES = ['pending', 'accepted', 'rejected', 'clarification_needed'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

/** Backend DocumentQueueRow (GET /admin/documents): current version of each partner document. */
interface QueueRow {
  document_id: string
  organization_id: string
  organization_name: string
  category: string
  version_no: number
  original_filename: string
  upload_status: string
  review_status: ReviewStatus
  review_comment: string | null
  uploaded_at: string
  expires_on: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
}
/** Backend DocumentReviewHistoryRow (GET /admin/documents/{id}/history). */
interface HistoryRow {
  version_no: number
  review_status: ReviewStatus
  review_comment: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  uploaded_at: string
}
interface Page<T> {
  data: T[] | null
  meta: Record<string, unknown> | null
}

const list = async (p: Record<string, unknown>) => {
  const { data } = await api.get<Page<QueueRow>>(BASE, { params: p })
  return { rows: data.data ?? [], meta: data.meta }
}

/** Exact backend total for a review status (one-row page); undefined = unavailable, never zero. */
export const useQueueCount = (review_status?: ReviewStatus) =>
  useQuery({
    queryKey: ['documents', 'queue-count', review_status ?? 'all'],
    queryFn: async () => {
      const t = (await list({ review_status, page: 1, page_size: 1 })).meta?.total
      return typeof t === 'number' ? t : undefined
    },
    retry: false,
  })

function History({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ['documents', 'history', id],
    queryFn: async () =>
      (
        await api.get<Page<HistoryRow>>(`${BASE}/${id}/history`, {
          params: { page: 1, page_size: 50 },
        })
      ).data.data ?? [],
    retry: false,
  })
  if (q.isPending) return <LoadingState label="Loading history…" />
  if (q.isError) return <ErrorState message={toAppError(q.error).message} />
  if (!q.data.length) return <EmptyState title="No review history" />
  return (
    <ul className="space-y-1 text-xs">
      {q.data.map((h) => (
        <li key={h.version_no}>
          v{h.version_no} · uploaded {formatDate(h.uploaded_at)} · {humanize(h.review_status)}
          {h.reviewed_by_name ? ` by ${h.reviewed_by_name}` : ''}
          {h.reviewed_at ? ` on ${formatDate(h.reviewed_at)}` : ''}
          {h.review_comment ? ` — ${h.review_comment}` : ''}
        </li>
      ))}
    </ul>
  )
}

/** Cross-application queue of partner documents (reviewers see only their assigned organisations). */
export function DocumentQueue() {
  const [status, setStatus] = useState<ReviewStatus | 'all'>('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)
  const term = useDeferredValue(search.trim())
  const params = {
    review_status: status === 'all' ? undefined : status,
    q: term || undefined,
    sort: '-uploaded_at',
    page,
    page_size: 20,
  }
  const q = useQuery({
    queryKey: ['documents', 'queue', params],
    queryFn: () => list(params),
    retry: false,
  })
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Documents awaiting verification</CardTitle>
      </CardHeader>
      <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
        <div className="w-full sm:w-64">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            label="Search file or organization"
          />
        </div>
        <FilterDropdown<ReviewStatus | 'all'>
          label="Review status"
          value={status}
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
          options={[
            { value: 'all', label: 'All' },
            ...REVIEW_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
          ]}
        />
      </div>
      {q.isPending ? (
        <LoadingState label="Loading documents…" />
      ) : q.isError ? (
        <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
      ) : q.data.rows.length === 0 ? (
        <EmptyState title="No documents match these filters" />
      ) : (
        <>
          <ul className="divide-y divide-line">
            {q.data.rows.map((r) => (
              <li key={r.document_id} className="space-y-1 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.organization_name}</span>
                  <span>{humanize(r.category)}</span>
                  <StatusBadge label={humanize(r.review_status)} />
                  <span className="text-muted">
                    {r.original_filename} · v{r.version_no} · uploaded {formatDate(r.uploaded_at)}
                    {r.expires_on ? ` · expires ${formatDate(r.expires_on)}` : ''}
                  </span>
                </div>
                {r.review_comment && <p className="text-muted">{r.review_comment}</p>}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpen(open === r.document_id ? null : r.document_id)}
                >
                  {open === r.document_id ? 'Hide review history' : 'Review history'}
                </Button>
                {open === r.document_id && <History id={r.document_id} />}
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageCount={pageCount(q.data.meta, page, 20, q.data.rows.length)}
            onChange={setPage}
          />
        </>
      )}
    </Card>
  )
}
