import { EmptyState } from '@/components/common/states'
import { PageHeader } from '@/components/common/PageHeader'
import { Async, Panel } from '../components/Panel'
import { RequestCard } from '../components/RequestCard'
import { useApplicationTracking } from '../hooks/useApplicationTracking'
import { infoRequests } from '../utils/applicationStatus'

/**
 * Phase 32. The backend (openapi.json, 2026-11-10) has NO partner follow-up resource: follow-ups
 * (`POST /admin/enquiries/{id}/follow-ups`) are staff-only. The only partner-actionable requests
 * are reviewer information requests (messages), so those are what this page lists; reply goes
 * through the existing messages endpoint. No due dates, categories or "mark complete" exist.
 */
export default function PartnerFollowUpsPage() {
  const { applications, app, messages, respond } = useApplicationTracking()
  const reqs = infoRequests(messages.data)
  const open = reqs.filter((r) => !r.answered)
  const done = reqs.filter((r) => r.answered)
  const list = (items: typeof reqs) => (
    <ul className="space-y-3">
      {items.map((r) => (
        <RequestCard
          key={r.message.id}
          r={r}
          sending={respond.isPending}
          onSend={(body) => respond.mutateAsync({ inReplyTo: r.message.id, body })}
        />
      ))}
    </ul>
  )
  return (
    <div className="space-y-4">
      <PageHeader
        title="Follow-ups"
        description="Information requests from the Coral Swift team that need your response."
      />
      <Async q={app ? messages : applications}>
        {!app ? (
          <EmptyState
            title="No application yet"
            description="Requests appear here once you have an application."
          />
        ) : (
          <>
            <Panel title="Awaiting your response">
              {open.length ? (
                list(open)
              ) : (
                <p className="text-sm text-muted">Nothing needs your response.</p>
              )}
            </Panel>
            <Panel title="Answered">
              {done.length ? (
                list(done)
              ) : (
                <p className="text-sm text-muted">No answered requests.</p>
              )}
            </Panel>
          </>
        )}
      </Async>
      <p className="text-sm text-muted">
        Follow-ups created by staff, due dates and completion tracking are not shared in the Partner
        Portal. Your Coral Swift contact will reach you directly.
      </p>
    </div>
  )
}
