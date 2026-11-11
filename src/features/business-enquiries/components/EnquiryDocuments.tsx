import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Pagination } from '@/components/common/Pagination'
import { ErrorState, LoadingState } from '@/components/common/states'
import { enquiryEndpoints as e } from '@/config/endpoints'
import { api } from '@/services/api/client'
import { toAppError } from '@/services/api/errors'
import { Attachments } from '../pages/EnquiryDetailPage'

const SIZE = 20

/**
 * GET /admin/enquiries/{id}/documents (EnquiryDocumentOut, paginated). The backend decides which
 * staff roles may list or download attachments; a 403 is shown, never worked around.
 */
export function EnquiryDocuments({ id }: { id: string }) {
  const [page, setPage] = useState(1)
  const q = useQuery({
    queryKey: ['enquiries', 'documents', id, page],
    queryFn: async () => {
      const r = await api.get<{
        data: Record<string, unknown>[] | null
        meta?: { total?: number }
      }>(e.documents(id), { params: { page, page_size: SIZE } })
      return { rows: r.data.data ?? [], total: r.data.meta?.total }
    },
    retry: false,
  })
  if (q.isPending) return <LoadingState label="Loading attachments…" />
  if (q.isError)
    return <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
  const { rows, total } = q.data
  // Without meta.total a full page is the only hint that another page exists.
  const pages =
    typeof total === 'number' ? Math.ceil(total / SIZE) : rows.length === SIZE ? page + 1 : page
  return (
    <>
      <Attachments id={id} docs={rows} />
      {pages > 1 && <Pagination page={page} pageCount={pages} onChange={setPage} />}
    </>
  )
}
