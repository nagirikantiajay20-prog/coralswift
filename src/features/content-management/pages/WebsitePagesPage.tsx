import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDateTime, pageCount, shortId } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { ContentStatusBadge } from '../components/ContentParts'
import { useContentList } from '../hooks/useContent'
import {
  CONTENT_STATUSES,
  CONTENT_TYPES,
  type AdminContent,
  type ContentStatus,
  type ContentType,
} from '../types'
import { STATUS_LABEL, TYPE_LABEL } from '../utils/content'

const PAGE_SIZE = 20
const isStatus = (s: string | null): s is ContentStatus =>
  (CONTENT_STATUSES as readonly string[]).includes(s ?? '')

/** `queue` = the approval queue: a fixed in_review filter over the same endpoint. */
export default function WebsitePagesPage({ queue }: { queue?: boolean }) {
  const [params] = useSearchParams()
  const initial = params.get('status')
  const [status, setStatus] = useState<ContentStatus | ''>(
    queue ? 'in_review' : isStatus(initial) ? initial : '',
  )
  const [type, setType] = useState<ContentType | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useContentList({
    status: status || undefined,
    type: type || undefined,
    q: search.trim() || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const columns: Column<AdminContent>[] = [
    {
      header: 'Title',
      cell: (r) => (
        <Link
          to={`/admin/website/pages/${r.id}`}
          className="font-medium text-coral-ink hover:underline"
        >
          {r.title}
        </Link>
      ),
    },
    { header: 'Slug', cell: (r) => <span className="font-mono text-xs">{r.slug}</span> },
    { header: 'Type', cell: (r) => TYPE_LABEL[r.content_type] ?? r.content_type },
    { header: 'Category', cell: (r) => r.category ?? '—' },
    { header: 'Status', cell: (r) => <ContentStatusBadge status={r.status} /> },
    { header: 'Published', cell: (r) => formatDateTime(r.published_at) },
    { header: 'Version', cell: (r) => `v${r.current_version}` },
    {
      header: 'Owner',
      cell: (r) => <span className="font-mono text-xs">{shortId(r.owner_id)}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title={queue ? 'Content approval queue' : 'Website content'}
        description={
          queue
            ? 'Items waiting for review. Approval is restricted to super administrators by the backend.'
            : 'Articles, FAQs, pages and resources managed by the backend.'
        }
        actions={
          !queue && (
            <Button asChild>
              <Link to="/admin/website/pages/new">New content</Link>
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-56 flex-1">
            <SearchInput
              label="Search content"
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
            />
          </div>
          {!queue && (
            <FilterDropdown
              label="Status"
              value={status}
              onChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
              options={[
                { value: '', label: 'All statuses' },
                ...CONTENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
              ]}
            />
          )}
          <FilterDropdown
            label="Content type"
            value={type}
            onChange={(v) => {
              setType(v)
              setPage(1)
            }}
            options={[
              { value: '', label: 'All types' },
              ...CONTENT_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] })),
            ]}
          />
        </div>
        <p className="px-4 pb-2 text-xs text-muted">
          Search, status, type and pagination are server-side. The API offers no category filter,
          sorting, updated-at or updated-by.
        </p>
        {q.isPending ? (
          <LoadingState label="Loading content…" />
        ) : q.isError ? (
          <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={q.data.rows}
              rowKey={(r) => r.id}
              emptyTitle={
                queue ? 'Nothing is waiting for review' : 'No content matches these filters'
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
    </>
  )
}
