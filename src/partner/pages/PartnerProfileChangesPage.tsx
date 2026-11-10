import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toAppError } from '@/services/api/errors'
import { usePartnerProfile } from '../hooks/usePartnerProfile'
import { label } from '../utils/profileFields'

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '')
// Only the statuses the Admin Console is known to use; anything else renders neutrally.
const tone = (s: string): StatusTone =>
  s === 'pending'
    ? 'warning'
    : s === 'approved'
      ? 'success'
      : s === 'rejected'
        ? 'danger'
        : 'neutral'
const show = (v: unknown) =>
  Array.isArray(v)
    ? v
        .map((x) => (typeof x === 'object' ? Object.values(x as object).join(' · ') : String(x)))
        .join('; ')
    : String(v)

export default function PartnerProfileChangesPage() {
  const { requests, history } = usePartnerProfile()
  const fail = (q: { isError: boolean; error: unknown; refetch: () => unknown }) =>
    q.isError ? (
      <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
    ) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile changes"
        description="Change requests sent for staff review, and the history of saved profile changes."
      />
      <Card aria-label="Change requests">
        <CardHeader>
          <CardTitle>Change requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.isLoading ? (
            <LoadingState />
          ) : (
            (fail(requests) ??
            (!requests.data?.length ? (
              <EmptyState
                title="No change requests"
                description="Requests you submit for approval appear here."
              />
            ) : (
              <ul className="divide-y divide-line">
                {requests.data.map((r) => (
                  <li key={r.id} className="space-y-1 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={r.status.replace(/_/g, ' ')} tone={tone(r.status)} />
                      <span className="text-muted">Submitted {when(r.created_at)}</span>
                      {r.decided_at && (
                        <span className="text-muted">Decided {when(r.decided_at)}</span>
                      )}
                    </div>
                    <p>
                      <span className="text-muted">Reason: </span>
                      {r.reason}
                    </p>
                    <dl className="grid gap-1 sm:grid-cols-2">
                      {Object.entries(r.changes).map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-muted">{label(k)}</dt>
                          <dd className="break-words">{show(v)}</dd>
                        </div>
                      ))}
                    </dl>
                    {r.decision_note && (
                      <p>
                        <span className="text-muted">Reviewer feedback: </span>
                        {r.decision_note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )))
          )}
        </CardContent>
      </Card>

      <Card aria-label="Change history">
        <CardHeader>
          <CardTitle>Change history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.isLoading ? (
            <LoadingState />
          ) : (
            (fail(history) ??
            (!history.data?.length ? (
              <EmptyState title="No saved changes yet" />
            ) : (
              <ul className="divide-y divide-line">
                {history.data.map((h) => (
                  <li key={h.version} className="py-3 text-sm">
                    <span className="font-medium">Version {h.version}</span>{' '}
                    <span className="text-muted">{when(h.created_at)}</span>
                    <p>
                      Updated: {Object.keys(h.changes).map(label).join(', ') || 'No field details'}
                    </p>
                  </li>
                ))}
              </ul>
            )))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
