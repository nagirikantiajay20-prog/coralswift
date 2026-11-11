import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState, LoadingState } from '@/components/common/states'
import { humanize } from '@/features/partner-applications/utils/format'
import { api } from '@/services/api/client'
import { toAppError } from '@/services/api/errors'
import type { ResolvedRange } from '../utils/range'

interface Count {
  key: string
  count: number
}
interface FollowUpReport {
  total: number
  by_kind: Count[]
  by_status: Count[]
  by_month: { period: string; count: number }[]
}
interface DocumentReviewReport {
  total_versions: number
  by_review_status: Count[]
  avg_turnaround_hours: number | null
}

interface CommunicationReport {
  total: number
  by_delivery_status: Count[]
  by_template: Count[]
}

const get = async <T,>(path: string, range: ResolvedRange) =>
  (
    await api.get<{ data: T | null }>(`/api/v1/admin/reports/${path}`, {
      params: { created_from: range.from, created_to: range.to },
    })
  ).data.data

function Counts({ title, rows }: { title: string; rows: Count[] }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-medium uppercase text-muted">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">None</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((r) => (
            <li key={r.key} className="flex justify-between gap-3">
              <span>{humanize(r.key)}</span>
              <span className="font-medium">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Panel<T>({
  title,
  q,
  children,
}: {
  title: string
  q: {
    isPending: boolean
    isError: boolean
    error: unknown
    data?: T | null
    refetch: () => unknown
  }
  children: (d: T) => React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {q.isPending ? (
          <LoadingState label="Loading…" />
        ) : q.isError ? (
          <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
        ) : q.data ? (
          children(q.data)
        ) : (
          <p className="text-sm text-muted">The backend returned no data.</p>
        )}
      </CardContent>
    </Card>
  )
}

/** Backend-computed follow-up and document-review reports (GET /admin/reports/follow-ups | document-review). */
export function BackendReports({ range }: { range: ResolvedRange }) {
  const fu = useQuery({
    queryKey: ['reports', 'follow-ups', range.from, range.to],
    queryFn: () => get<FollowUpReport>('follow-ups', range),
    retry: false,
  })
  const dr = useQuery({
    queryKey: ['reports', 'document-review', range.from, range.to],
    queryFn: () => get<DocumentReviewReport>('document-review', range),
    retry: false,
  })
  const cm = useQuery({
    queryKey: ['reports', 'communications', range.from, range.to],
    queryFn: () => get<CommunicationReport>('communications', range),
    retry: false,
  })
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <Panel title="Follow-ups" q={fu}>
        {(d) => (
          <div className="space-y-3">
            <p className="text-sm">
              Total: <b>{d.total}</b>
            </p>
            <Counts title="By kind" rows={d.by_kind} />
            <Counts title="By status" rows={d.by_status} />
            <Counts
              title="By month"
              rows={d.by_month.map((m) => ({ key: m.period.slice(0, 7), count: m.count }))}
            />
          </div>
        )}
      </Panel>
      <Panel title="Document review" q={dr}>
        {(d) => (
          <div className="space-y-3">
            <p className="text-sm">
              Versions reviewed or pending: <b>{d.total_versions}</b>
            </p>
            <p className="text-sm">
              Average turnaround:{' '}
              <b>
                {d.avg_turnaround_hours === null
                  ? 'not enough data'
                  : `${d.avg_turnaround_hours.toFixed(1)} h`}
              </b>
            </p>
            <Counts title="By review status" rows={d.by_review_status} />
          </div>
        )}
      </Panel>
      <Panel title="Communications" q={cm}>
        {(d) => (
          <div className="space-y-3">
            <p className="text-sm">
              Emails in range: <b>{d.total}</b>
            </p>
            <Counts title="By delivery status" rows={d.by_delivery_status} />
            <Counts title="By template" rows={d.by_template} />
          </div>
        )}
      </Panel>
    </div>
  )
}
