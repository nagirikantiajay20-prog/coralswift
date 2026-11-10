import { ExternalLink, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FollowUpDialog } from '@/features/business-enquiries/components/EnquiryActions'
import { useEnquiryDetail } from '@/features/business-enquiries/hooks/useEnquiries'
import type { EnquiryRow } from '@/features/business-enquiries/types'
import { FollowUpList } from '@/features/follow-ups/components/FollowUpList'
import { recordPath, type RecordKind } from '@/features/follow-ups/utils/followUps'
import { NoteDialog } from '@/features/partner-applications/components/ReviewActions'
import { useMessages, useNotes } from '@/features/partner-applications/hooks/useApplications'
import type { ReviewerApplication } from '@/features/partner-applications/types'
import { formatDateTime, humanize, shortId } from '@/features/partner-applications/utils/format'
import { ConfidentialBanner } from '@/features/strategic-enquiries/components/ConfidentialBanner'
import { toAppError } from '@/services/api/errors'

function Panel({
  title,
  reference,
  href,
  onClose,
  children,
}: {
  title: string
  reference: string
  href: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <Card className="mb-4 p-4" aria-label={`${title} ${reference}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex-1 font-heading text-base font-semibold">
          {title}: {reference}
        </h2>
        <Button asChild variant="secondary" size="sm">
          <Link to={href}>
            <ExternalLink className="size-4" aria-hidden /> Open record
          </Link>
        </Button>
        <Button variant="secondary" size="sm" onClick={onClose} aria-label="Close thread">
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      {children}
    </Card>
  )
}

/** Enquiry thread: the contact's original message (inbound) plus INTERNAL notes / follow-ups. */
export function EnquiryThread({ row, onClose }: { row: EnquiryRow; onClose: () => void }) {
  const q = useEnquiryDetail(row.id)
  const [adding, setAdding] = useState(false)
  const strategic = row.enquiry_type === 'strategic'
  return (
    <Panel
      title="Enquiry thread"
      reference={row.reference_number}
      href={recordPath(row.enquiry_type as RecordKind, row.id)}
      onClose={onClose}
    >
      {strategic && <ConfidentialBanner />}
      <p className="mb-3 rounded bg-surface p-2 text-xs text-muted">
        Entries below are internal staff records. The backend has no reply endpoint for enquiries,
        so nothing added here is sent to the contact.
      </p>
      {q.isPending ? (
        <LoadingState label="Loading thread…" />
      ) : q.isError ? (
        <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-4">
          {q.data.message && (
            <div className="rounded border border-line p-3 text-sm">
              <StatusBadge label="Submitted by contact (inbound)" />
              <p className="mt-2 whitespace-pre-wrap break-words">{q.data.message}</p>
              <p className="mt-2 text-xs text-muted">{formatDateTime(q.data.enquiry.created_at)}</p>
            </div>
          )}
          <Button size="sm" onClick={() => setAdding(true)}>
            Add internal note / follow-up
          </Button>
          <FollowUpList enquiryId={row.id} items={q.data.follow_ups} />
        </div>
      )}
      {adding && <FollowUpDialog id={row.id} onClose={() => setAdding(false)} />}
    </Panel>
  )
}

/** Application thread: INTERNAL notes and the backend's partner-facing messages, kept separate. */
export function ApplicationThread({
  app,
  onClose,
}: {
  app: ReviewerApplication
  onClose: () => void
}) {
  const notes = useNotes(app.id)
  const messages = useMessages(app.id)
  const [adding, setAdding] = useState(false)
  const list = <T,>(
    q: { isPending: boolean; isError: boolean; error: unknown; refetch: () => void; data?: T[] },
    empty: string,
    item: (x: T) => React.ReactNode,
  ) =>
    q.isPending ? (
      <LoadingState />
    ) : q.isError ? (
      <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
    ) : q.data?.length ? (
      <ul className="space-y-3">{q.data.map(item)}</ul>
    ) : (
      <EmptyState title={empty} />
    )
  return (
    <Panel
      title="Application thread"
      reference={app.reference}
      href={recordPath('application', app.id)}
      onClose={onClose}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Internal notes">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="flex-1 text-sm font-semibold">Internal notes</h3>
            <Button size="sm" onClick={() => setAdding(true)}>
              Add internal note
            </Button>
          </div>
          <p className="mb-2 text-xs text-muted">
            Never visible to the partner (backend-enforced).
          </p>
          {list(notes, 'No internal notes', (n) => (
            <li key={n.id} className="rounded border border-line p-3 text-sm">
              <StatusBadge label="Internal note" tone="info" />
              <p className="mt-2 whitespace-pre-wrap break-words">{n.body}</p>
              <p className="mt-1 text-xs text-muted">
                {shortId(n.author_id)} · {formatDateTime(n.created_at)}
              </p>
            </li>
          ))}
        </section>
        <section aria-label="Partner messages">
          <h3 className="mb-2 text-sm font-semibold">Information requests & partner replies</h3>
          <p className="mb-2 text-xs text-muted">
            Recorded by the backend as partner-facing. Delivery is not reported. Send new requests
            from the application workspace.
          </p>
          {list(messages, 'No messages', (m) => (
            <li key={m.id} className="rounded border border-line p-3 text-sm">
              <StatusBadge label={humanize(m.kind)} tone="warning" />
              <p className="mt-2 whitespace-pre-wrap break-words">{m.body}</p>
              <p className="mt-1 text-xs text-muted">
                {shortId(m.author_user_id)} · {formatDateTime(m.created_at)}
              </p>
            </li>
          ))}
        </section>
      </div>
      {adding && <NoteDialog id={app.id} onClose={() => setAdding(false)} />}
    </Panel>
  )
}
