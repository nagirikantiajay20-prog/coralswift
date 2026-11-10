import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime, humanize } from '@/features/partner-applications/utils/format'
import { useActorNames } from '../hooks/useAudit'
import type { AuditEntry } from '../types'

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="grid gap-1 py-2 sm:grid-cols-3">
    <dt className="text-sm text-muted">{k}</dt>
    <dd className="break-all text-sm sm:col-span-2">{v ?? '—'}</dd>
  </div>
)

/**
 * The backend has no get-by-id endpoint, so the (already sanitised) event is passed from the list via
 * router state. Opening the URL cold shows how to reach the event instead of fabricating it.
 */
export default function AuditLogDetailPage() {
  const entry = (useLocation().state as { entry?: AuditEntry } | null)?.entry
  const { name } = useActorNames()
  const back = (
    <Link to="/admin/audit-logs" className="inline-flex items-center gap-1 text-sm text-coral-ink">
      <ArrowLeft className="size-4" aria-hidden /> Back to audit logs
    </Link>
  )
  if (!entry) {
    return (
      <>
        <PageHeader title="Audit event" />
        <Card>
          <EmptyState
            title="Event not loaded"
            description="The backend cannot fetch a single audit event by id. Open it from the audit log list."
            action={back}
          />
        </Card>
      </>
    )
  }
  const meta = Object.entries(entry.meta)
  return (
    <>
      <PageHeader
        title="Audit event"
        description={`Recorded ${formatDateTime(entry.at)}`}
        actions={back}
      />
      <p className="mb-4 text-xs text-muted">
        Read-only. Audit records cannot be edited or deleted.
      </p>
      {entry.restricted && (
        <p role="note" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          This event relates to Strategic / M&amp;A activity. Its details are withheld for your
          role.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-line">
              <Row k="Action" v={humanize(entry.action)} />
              <Row k="Module (record type)" v={humanize(entry.recordType)} />
              <Row k="Record id" v={entry.recordId || '—'} />
              <Row k="Organization id" v={entry.organizationId} />
              <Row k="Request id" v={entry.requestId} />
              <Row k="Event id" v={entry.id} />
              <Row k="Timestamp" v={formatDateTime(entry.at)} />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Actor</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-line">
              <Row k="Actor type" v={<StatusBadge label={humanize(entry.actorType)} />} />
              <Row k="Administrator" v={name(entry.actorUserId)} />
              <Row k="User id" v={entry.actorUserId} />
            </dl>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
          <p className="text-xs text-muted">
            Backend-provided and unstructured. Values under password, token, secret or key-like
            names are masked. No before/after fields are defined by the API.
          </p>
        </CardHeader>
        <CardContent>
          {meta.length === 0 ? (
            <p className="text-sm text-muted">No additional metadata.</p>
          ) : (
            <dl className="divide-y divide-line">
              {meta.map(([k, v]) => (
                <Row
                  key={k}
                  k={humanize(k)}
                  v={
                    typeof v === 'object' && v !== null ? (
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(v, null, 2)}
                      </pre>
                    ) : (
                      String(v)
                    )
                  }
                />
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </>
  )
}
