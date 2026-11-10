import { CheckCircle2, Circle, CircleDashed, PauseCircle, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useAuthStore } from '@/store/authStore'
import { RequestCard } from '../components/RequestCard'
import { Async, day, errText, human, Panel, when } from '../components/Panel'
import { PARTNER_ROUTES as R } from '../config/routes'
import { useApplicationTracking } from '../hooks/useApplicationTracking'
import {
  buildTracker,
  decisionOf,
  infoRequests,
  lifecycle,
  statusInfo,
  type StageState,
} from '../utils/applicationStatus'

const STAGE_ICON: Record<StageState, typeof Circle> = {
  complete: CheckCircle2,
  current: Circle,
  upcoming: CircleDashed,
  unconfirmed: CircleDashed,
}
const STAGE_TEXT: Record<StageState, string> = {
  complete: 'Completed',
  current: 'Current stage',
  upcoming: 'Upcoming',
  unconfirmed: 'Not recorded',
}

export default function PartnerApplicationPage() {
  const { applications, app, history, messages, respond } = useApplicationTracking()
  const company = useAuthStore((s) => s.partner?.organizationName)

  if (applications.isLoading)
    return (
      <div
        role="status"
        aria-label="Loading application"
        className="h-24 animate-pulse rounded bg-surface"
      />
    )
  if (applications.isError)
    return (
      <ErrorState message={errText(applications.error)} onRetry={() => applications.refetch()} />
    )
  if (!app)
    return (
      <EmptyState
        title="No application on record"
        description="When your partner application is created it will appear here."
        icon={Send}
      />
    )

  const info = statusInfo(app.status)
  const hist = [...(history.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const stages = buildTracker(app, history.data ?? [])
  const decision = decisionOf(app, history.data ?? [])
  const requests = infoRequests(messages.data)
  const pending = requests.filter((r) => !r.answered)
  const notes = (messages.data ?? []).filter(
    (m) => m.from_reviewer && !requests.some((r) => r.message.id === m.id),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Application</h1>
        <p className="text-sm text-muted">Track your partner application and onboarding journey.</p>
      </div>

      <Panel title="Overview">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-muted">Reference</dt>
            <dd>{app.reference}</dd>
          </div>
          <div>
            <dt className="text-muted">Company</dt>
            <dd>{company ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Submitted</dt>
            <dd>{app.submitted_at ? when(app.submitted_at) : 'Not yet submitted'}</dd>
          </div>
          {app.pathway && (
            <div>
              <dt className="text-muted">Partner pathway</dt>
              <dd>{human(app.pathway)}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">Last updated</dt>
            <dd>{hist[0] ? when(hist[0].created_at) : '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Status</dt>
            <dd>
              <StatusBadge label={app.status_label} tone={info.tone} />
            </dd>
          </div>
        </dl>
        {info.meaning && <p className="mt-3 text-sm">{info.meaning}</p>}
        <p className="mt-1 text-sm" aria-label="Pending action">
          <span className="font-medium">Next: </span>
          {pending.length
            ? `Respond to ${pending.length} information request(s).`
            : info.next || 'No action needed.'}
        </p>
      </Panel>

      {decision && (
        <Panel title="Decision">
          <div className="space-y-1 text-sm">
            <StatusBadge label={app.status_label} tone={info.tone} />
            <p>{info.meaning}</p>
            <p className="text-muted">Communicated {day(decision.date)}</p>
            {decision.reason ? (
              <p className="whitespace-pre-wrap">{decision.reason}</p>
            ) : (
              <p className="text-muted">No explanation has been provided.</p>
            )}
            <p>{info.next}</p>
          </div>
        </Panel>
      )}

      <Panel title="Progress">
        <Async q={history}>
          {!stages.length ? (
            <p className="text-sm text-muted">
              Progress appears once the application is submitted.
            </p>
          ) : (
            <ol
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Application progress"
            >
              {stages.map((s) => {
                const Icon = s.paused ? PauseCircle : STAGE_ICON[s.state]
                return (
                  <li
                    key={s.key}
                    aria-current={s.state === 'current' ? 'step' : undefined}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Icon
                      className={`mt-0.5 size-5 shrink-0 ${s.state === 'complete' ? 'text-emerald-700' : s.state === 'current' ? 'text-coral-ink' : 'text-muted'}`}
                      aria-hidden
                    />
                    <span>
                      <span className="font-medium">{s.label}</span>
                      <br />
                      <span className="text-muted">
                        {s.paused ? 'Current stage · information requested' : STAGE_TEXT[s.state]}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </Async>
      </Panel>

      <Panel title="Information requests">
        <Async q={messages}>
          {!requests.length ? (
            <p className="text-sm text-muted">No information requests.</p>
          ) : (
            <ul className="space-y-3">
              {requests.map((r) => (
                <RequestCard
                  key={r.message.id}
                  r={r}
                  sending={respond.isPending}
                  onSend={(body) => respond.mutateAsync({ inReplyTo: r.message.id, body })}
                />
              ))}
            </ul>
          )}
        </Async>
      </Panel>

      <Panel title="Messages from the review team">
        <Async q={messages}>
          {!notes.length ? (
            <p className="text-sm text-muted">No other messages.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {notes.map((m) => (
                <li key={m.id} className="py-2">
                  <p className="text-muted">{when(m.created_at)}</p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Async>
      </Panel>

      <Panel title="Status history">
        <Async q={history}>
          {!hist.length ? (
            <p className="text-sm text-muted">No status changes recorded yet.</p>
          ) : (
            <ol className="divide-y divide-line text-sm">
              {hist.map((h, i) => (
                <li key={i} className="py-2">
                  <p className="font-medium">
                    {h.to_label}{' '}
                    <span className="font-normal text-muted">· {when(h.created_at)}</span>
                  </p>
                  {h.note && <p className="whitespace-pre-wrap text-muted">{h.note}</p>}
                  {statusInfo(h.to_status).next && (
                    <p className="text-muted">Next: {statusInfo(h.to_status).next}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Async>
      </Panel>

      <Panel title="Onboarding lifecycle">
        <Async q={history}>
          <ul className="space-y-2 text-sm">
            {lifecycle(app, history.data ?? []).map((l) => (
              <li key={l.label} className="flex flex-wrap items-center justify-between gap-2">
                <span>{l.label}</span>
                <span className="flex items-center gap-2 text-muted">
                  {l.detail}
                  <StatusBadge
                    label={l.confirmed ? 'Confirmed' : 'Not recorded'}
                    tone={l.confirmed ? 'success' : 'neutral'}
                  />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Eligibility verification outcomes and scores are not shared with partners. Account
            provisioning is managed by Coral Swift staff.
          </p>
        </Async>
      </Panel>

      <p className="text-sm">
        <Link to={R.company} className="text-coral-ink hover:underline">
          Company profile
        </Link>
        {' · '}
        <Link to={R.documents} className="text-coral-ink hover:underline">
          Documents
        </Link>
      </p>
    </div>
  )
}
