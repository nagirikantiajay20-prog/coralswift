import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { Async, field, human, Panel, when } from '../components/Panel'
import { partnerDashboardService as s } from '../services/partnerDashboardService'

const SIZE = 20

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
        {(readOne.isError || readAll.isError) && (
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
                      {human(field(n, ['template', 'type', 'subject']) ?? 'Email')}
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
