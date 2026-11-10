import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Async, human, Panel, when } from '../components/Panel'
import { RequestCard } from '../components/RequestCard'
import { PARTNER_ROUTES as R } from '../config/routes'
import { useApplicationTracking } from '../hooks/useApplicationTracking'
import { infoRequests } from '../utils/applicationStatus'

/**
 * Communications for the latest application. Backend contract (openapi 2026-11-10): partner-visible
 * messages only (reviewer identity withheld), replies via POST in_reply_to + body. No read/unread
 * state, attachments or message search exist, so none are shown.
 */
export default function PartnerMessagesPage() {
  const { applications, app, messages, respond } = useApplicationTracking()
  const all = [...(messages.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const pending = infoRequests(messages.data).filter((r) => !r.answered)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Messages</h1>
        <p className="text-sm text-muted">
          Messages shared with you by the Coral Swift team
          {app ? ` for application ${app.reference}` : ''}.
        </p>
      </div>

      <Async q={app ? messages : applications}>
        {!app ? (
          <EmptyState
            title="No application yet"
            description="Messages appear here once you have an application."
          />
        ) : (
          <>
            <Panel title="Awaiting your response">
              {!pending.length ? (
                <p className="text-sm text-muted">Nothing needs your response.</p>
              ) : (
                <ul className="space-y-3">
                  {pending.map((r) => (
                    <RequestCard
                      key={r.message.id}
                      r={r}
                      sending={respond.isPending}
                      onSend={(body) => respond.mutateAsync({ inReplyTo: r.message.id, body })}
                    />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Conversation history">
              {!all.length ? (
                <EmptyState title="No messages" description="You have no messages yet." />
              ) : (
                <ol className="divide-y divide-line text-sm">
                  {all.map((m) => (
                    <li key={m.id} className="space-y-1 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {m.from_reviewer ? 'Coral Swift team' : 'You'}{' '}
                          <span className="font-normal text-muted">· {human(m.kind)}</span>
                        </span>
                        <span className="text-muted">{when(m.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        {m.status && <StatusBadge label={human(m.status)} />}
                        {m.requested_categories?.length ? (
                          <Link to={R.documents} className="text-coral-ink hover:underline">
                            Requested documents: {m.requested_categories.map(human).join(', ')}
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </>
        )}
      </Async>
    </div>
  )
}
