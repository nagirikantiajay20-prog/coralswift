import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ModuleKey } from '@/config/permissions'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { formatDateTime, humanize } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { communicationService as svc } from '../services/communicationService'

const SIZE = 20
type View = 'all' | 'unread' | 'archived'
/**
 * Known record types only (the spec types `record_type` as a free string); anything else, or a
 * destination this account's role cannot open, renders without a link. Strategic enquiries live in
 * their own module, so they never link to the general enquiry route.
 */
export function recordPath(
  type: string | null,
  id: string | null,
  strategic: boolean,
  can: (m: ModuleKey) => boolean,
) {
  if (!id) return undefined
  const x = encodeURIComponent(id)
  if (type === 'portal_application')
    return can('applications')
      ? `/admin/applications/${x}`
      : can('applicationReviews')
        ? `/admin/application-reviews/${x}`
        : undefined
  if (type === 'enquiry')
    return strategic
      ? can('strategicEnquiries')
        ? `/admin/strategic-enquiries/${x}`
        : undefined
      : can('enquiries')
        ? `/admin/enquiries/${x}`
        : undefined
  return undefined
}
const num = (v: unknown) => (typeof v === 'number' ? v : undefined)

/** Own notification feed: GET /admin/feed with read / read-all / archive. Rows are the signed-in user's only. */
export default function NotificationsFeedPage() {
  const { can } = useAuth()
  const [view, setView] = useState<View>('all')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['comms', 'feed', view, page],
    queryFn: () =>
      svc.feed({
        page,
        page_size: SIZE,
        unread: view === 'unread' || undefined,
        archived: view === 'archived' || undefined,
      }),
    placeholderData: (prev) => prev,
    retry: false,
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['comms', 'feed'] })
  const read = useMutation({ mutationFn: svc.feedRead, onSuccess: refresh })
  const archive = useMutation({ mutationFn: svc.feedArchive, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: svc.feedReadAll, onSuccess: refresh })
  const rows = q.data?.rows ?? []
  const unread = num(q.data?.meta?.unread)
  const pages = num(q.data?.meta?.pages) ?? 1
  const err = read.error ?? archive.error ?? readAll.error

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread === undefined ? undefined : `${unread} unread`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled={readAll.isPending || !unread}
            onClick={() => readAll.mutate()}
          >
            Mark all as read
          </Button>
        }
      />
      <div role="tablist" aria-label="Feed view" className="mb-3 flex gap-2">
        {(['all', 'unread', 'archived'] as const).map((v) => (
          <Button
            key={v}
            role="tab"
            aria-selected={view === v}
            size="sm"
            variant={view === v ? 'primary' : 'secondary'}
            onClick={() => {
              setView(v)
              setPage(1)
            }}
          >
            {humanize(v)}
          </Button>
        ))}
      </div>
      {err && (
        <p role="alert" className="mb-2 text-sm text-rose">
          {toAppError(err).message}
        </p>
      )}
      <Card>
        {q.isPending ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
        ) : !rows.length ? (
          <EmptyState title="No notifications" description="Nothing to show in this view." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className={n.is_read ? 'font-medium' : 'font-semibold'}>
                    {!n.is_read && <span className="mr-2 text-xs text-rose">Unread</span>}
                    {recordPath(n.record_type, n.record_id, n.is_strategic, can) ? (
                      <Link
                        to={recordPath(n.record_type, n.record_id, n.is_strategic, can)!}
                        className="hover:underline"
                        onClick={() => !n.is_read && read.mutate(n.id)}
                      >
                        {n.title}
                      </Link>
                    ) : (
                      n.title
                    )}
                    {n.is_strategic && (
                      <span className="ml-2">
                        <StatusBadge label="Strategic" tone="warning" />
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {humanize(n.kind)}
                    {n.record_type ? ` · ${humanize(n.record_type)}` : ''} ·{' '}
                    {formatDateTime(n.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!n.is_read && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={read.isPending}
                      onClick={() => read.mutate(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                  {!n.archived_at && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={archive.isPending}
                      onClick={() => archive.mutate(n.id)}
                    >
                      Archive
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pageCount={pages} onChange={setPage} />
      </Card>
    </>
  )
}
