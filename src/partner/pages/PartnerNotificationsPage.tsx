import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { Link } from 'react-router-dom'
import { Async, field, human, Panel, when } from '../components/Panel'
import { partnerDashboardService as s } from '../services/partnerDashboardService'

const SIZE = 20

/**
 * Category -> partner page, by EXACT (case-insensitive) category. The OpenAPI schema types
 * `category` and `related_reference` as free strings with no enumerated values, so no destination
 * is documented and none is guessed: the table ships empty, `related_reference` is shown as plain
 * text, and unknown categories are always safe. Add entries (e.g. `application_update:
 * PARTNER_ROUTES.application`) only once the backend publishes the values (docs/BACKEND_REQUESTS.md).
 */
export const CATEGORY_ROUTES: Record<string, string> = {}
export const destination = (category: string | undefined) =>
  category ? CATEGORY_ROUTES[category.toLowerCase()] : undefined

/**
 * GET /partner/notifications returns PartnerNotificationOut rows (template, delivery_status,
 * created_at, read_at, is_read); read state is changed with POST .../{id}/read and /read-all. The
 * backend has no preferences endpoint. The total is not returned, so a full page is the only
 * signal that a next page may exist.
 */
export default function PartnerNotificationsPage() {
  const pid = useAuthStore((st) => st.partner?.id)
  const [page, setPage] = useState(1)
  const q = useQuery({
    queryKey: ['partner', pid, 'notifications', 'page', page],
    queryFn: () => s.notificationsPage(page, SIZE),
    enabled: !!pid,
    staleTime: 60_000,
    retry: 1,
  })
  const rows = q.data ?? []
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['partner', pid, 'notifications'] })
  const readOne = useMutation({ mutationFn: s.markNotificationRead, onSuccess: refresh })
  const unreadOne = useMutation({ mutationFn: s.markNotificationUnread, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: s.markAllNotificationsRead, onSuccess: refresh })
  const unread = rows.some((n) => n.is_read === false)
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted">Emails sent to you by Coral Swift.</p>
      </div>
      <Panel title="Email notifications">
        {unread && (
          <Button
            variant="secondary"
            size="sm"
            className="mb-2"
            disabled={readAll.isPending}
            onClick={() => readAll.mutate()}
          >
            Mark all as read
          </Button>
        )}
        {(readOne.isError || readAll.isError || unreadOne.isError) && (
          <p role="alert" className="mb-2 text-sm text-rose-800">
            Could not update read state. Try again.
          </p>
        )}
        <Async q={q}>
          {!rows.length ? (
            <EmptyState
              title="No notifications"
              description={page > 1 ? 'No more notifications.' : 'No emails have been sent yet.'}
            />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {rows.map((n, i) => {
                const at = field(n, ['created_at', 'sent_at'])
                return (
                  <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className={n.is_read === false ? 'font-semibold' : 'font-medium'}>
                      {n.is_read === false && (
                        <span className="mr-2 text-xs text-rose-800">Unread</span>
                      )}
                      {field(n, ['title']) ??
                        human(field(n, ['template', 'type', 'subject']) ?? 'Email')}
                      {field(n, ['category']) && (
                        <span className="ml-2 text-xs font-normal text-muted">
                          {human(field(n, ['category'])!)}
                        </span>
                      )}
                      {field(n, ['related_reference']) &&
                        (destination(field(n, ['category'])) ? (
                          <Link
                            to={destination(field(n, ['category']))!}
                            className="ml-2 font-normal text-coral-ink hover:underline"
                          >
                            {field(n, ['related_reference'])}
                          </Link>
                        ) : (
                          <span className="ml-2 font-normal text-muted">
                            {field(n, ['related_reference'])}
                          </span>
                        ))}
                    </span>
                    <span className="flex items-center gap-2 text-muted">
                      {[field(n, ['delivery_status', 'status']), at && when(at)]
                        .filter(Boolean)
                        .join(' · ')}
                      {n.is_read === false && typeof n.id === 'string' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={readOne.isPending}
                          onClick={() => readOne.mutate(n.id as string)}
                        >
                          Mark read
                        </Button>
                      )}
                      {n.is_read === true && typeof n.id === 'string' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={unreadOne.isPending}
                          onClick={() => unreadOne.mutate(n.id as string)}
                        >
                          Mark unread
                        </Button>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Async>
        {(page > 1 || rows.length === SIZE) && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">Page {page}</span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={rows.length < SIZE}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
