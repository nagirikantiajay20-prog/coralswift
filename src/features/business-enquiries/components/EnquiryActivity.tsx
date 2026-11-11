import { useQuery } from '@tanstack/react-query'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { enquiryEndpoints as e } from '@/config/endpoints'
import { formatDateTime, humanize } from '@/features/partner-applications/utils/format'
import { api } from '@/services/api/client'
import { toAppError } from '@/services/api/errors'

/** Backend ActivityOut (GET /admin/enquiries/{id}/activity): status, assignment and follow-up history. */
interface Activity {
  id: string
  action: string
  actor_type: string
  actor_name: string | null
  meta: Record<string, unknown>
  created_at: string
}

const detail = (m: Record<string, unknown>) =>
  Object.entries(m)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => `${humanize(k)}: ${String(v)}`)
    .join(' · ')

export function EnquiryActivity({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ['enquiries', 'activity', id],
    queryFn: async () =>
      (
        await api.get<{ data: Activity[] | null }>(e.activity(id), {
          params: { page: 1, page_size: 50 },
        })
      ).data.data ?? [],
    retry: false,
  })
  if (q.isPending) return <LoadingState label="Loading activity…" />
  if (q.isError)
    return <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
  if (q.data.length === 0) return <EmptyState title="No activity recorded yet" />
  return (
    <ul className="divide-y divide-line text-sm">
      {q.data.map((a) => (
        <li key={a.id} className="space-y-0.5 py-2">
          <p>
            <b>{humanize(a.action)}</b> · {a.actor_name ?? humanize(a.actor_type)} ·{' '}
            {formatDateTime(a.created_at)}
          </p>
          {detail(a.meta) && <p className="text-muted">{detail(a.meta)}</p>}
        </li>
      ))}
    </ul>
  )
}
