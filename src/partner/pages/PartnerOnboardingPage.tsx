import { CheckCircle2, Circle, CircleDashed, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/common/states'
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge'
import { useAuthStore } from '@/store/authStore'
import type { ReviewStatus } from '@/features/partner-applications/types'
import { Async, day, errText, human, Panel, when } from '../components/Panel'
import { PARTNER_ROUTES as R } from '../config/routes'
import { useOnboarding } from '../hooks/useOnboarding'
import { statusInfo } from '../utils/applicationStatus'
import { REVIEW_LABEL, STATUS_TONE } from '../utils/documentFiles'
import {
  onboardingHistory,
  onboardingLifecycle,
  onboardingMessages,
  onboardingSummary,
  onboardingTracker,
  partnerActions,
} from '../utils/onboarding'

const STAGE_ICON = { complete: CheckCircle2, current: Circle, upcoming: CircleDashed }
const STAGE_TEXT = { complete: 'Completed', current: 'Current stage', upcoming: 'Upcoming' }

export default function PartnerOnboardingPage() {
  const { applications, app, history, messages, completion, documents } = useOnboarding()
  const company = useAuthStore((s) => s.partner?.organizationName)

  if (applications.isLoading)
    return (
      <div
        role="status"
        aria-label="Loading onboarding"
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
        title="No onboarding on record"
        description="Onboarding can only start after a partner application has been submitted and a decision communicated."
        icon={ClipboardList}
      />
    )

  const hist = history.data ?? []
  const sum = onboardingSummary(app, hist)
  const stages = onboardingTracker(app, hist)
  const actions = partnerActions({
    messages: messages.data,
    documents: documents.data,
    completion: completion.data,
  })
  const actionsQ = [messages, documents, completion]
  const actionsLoading = actionsQ.some((q) => q.isLoading)
  const actionsFailed = actionsQ.find((q) => q.isError)
  const msgs = onboardingMessages(messages.data, sum.initiatedAt)
  const docs = documents.data ?? []
  const items = onboardingHistory(hist)
  const next =
    sum.phase === 'closed' || sum.phase === 'not_started'
      ? statusInfo(app.status).next
      : actions.length
        ? `Complete ${actions.length} outstanding action(s) below.`
        : 'No action needed from you right now. Our team will contact you about next steps.'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Onboarding</h1>
        <p className="text-sm text-muted">
          Track your onboarding with Coral Swift. This is separate from your{' '}
          <Link to={R.application} className="text-coral-ink hover:underline">
            application review
          </Link>
          , and a decision on your application does not mean onboarding is complete.
        </p>
      </div>

      <Panel title="Overview">
        <Async q={history}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted">Company</dt>
              <dd>{company ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Partner application reference</dt>
              <dd>{app.reference}</dd>
            </div>
            <div>
              <dt className="text-muted">Onboarding reference</dt>
              <dd>Not issued by the backend</dd>
            </div>
            <div>
              <dt className="text-muted">Onboarding status</dt>
              <dd>
                <StatusBadge label={sum.label} tone={sum.tone} />
              </dd>
            </div>
            <div>
              <dt className="text-muted">Onboarding initiated</dt>
              <dd>{sum.initiatedAt ? when(sum.initiatedAt) : 'Not initiated'}</dd>
            </div>
            <div>
              <dt className="text-muted">Last updated</dt>
              <dd>{when(sum.lastUpdatedAt)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm">{sum.detail}</p>
          <p className="mt-1 text-sm" aria-label="Next action">
            <span className="font-medium">Next: </span>
            {next || 'No action needed.'}
          </p>
        </Async>
      </Panel>

      <Panel title="Onboarding progress">
        <Async q={history}>
          {!stages.length ? (
            <p className="text-sm text-muted">
              {sum.phase === 'closed'
                ? 'No onboarding is in progress.'
                : 'Onboarding stages appear once onboarding has been initiated by Coral Swift.'}
            </p>
          ) : (
            <ol className="grid gap-3 sm:grid-cols-2" aria-label="Onboarding progress">
              {stages.map((s) => {
                const Icon = STAGE_ICON[s.state]
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
                        {STAGE_TEXT[s.state]}
                        {s.at && s.state !== 'upcoming' ? ` · ${day(s.at)}` : ''}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
          <p className="mt-3 text-xs text-muted">
            Only the stages the backend records are shown. Onboarding completion is not reported to
            partners.
          </p>
        </Async>
      </Panel>

      <Panel title="Actions for you">
        {actionsLoading ? (
          <div
            role="status"
            aria-label="Loading actions"
            className="h-4 w-2/3 animate-pulse rounded bg-surface"
          />
        ) : actionsFailed ? (
          <ErrorState
            message={errText(actionsFailed.error)}
            onRetry={() => actionsQ.filter((q) => q.isError).forEach((q) => void q.refetch())}
          />
        ) : !actions.length ? (
          <p className="text-sm text-muted">No outstanding actions.</p>
        ) : (
          <ul className="space-y-3">
            {actions.map((a) => (
              <li key={a.id} className="space-y-1 rounded-md border border-line p-3 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="line-clamp-3 whitespace-pre-wrap text-muted">{a.description}</p>
                <Link to={a.to} className="text-coral-ink hover:underline">
                  {a.linkLabel}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Onboarding checklist">
        <p className="text-sm text-muted">
          Coral Swift has not published an onboarding checklist to the Partner Portal, so no tasks,
          completion dates or progress are shown here. Outstanding items reported by the system
          appear under Actions for you.
        </p>
      </Panel>

      <Panel title="Documents">
        <Async q={documents}>
          {!docs.length ? (
            <p className="text-sm text-muted">No documents on file.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {docs.map((d) => {
                const rs = d.current_version?.review_status
                return (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>{human(d.category)}</span>
                    {rs && (
                      <StatusBadge
                        label={REVIEW_LABEL[rs as ReviewStatus] ?? human(rs)}
                        tone={(STATUS_TONE[rs as ReviewStatus] ?? 'neutral') as StatusTone}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-3 text-sm">
            <Link to={R.documents} className="text-coral-ink hover:underline">
              Upload or replace documents
            </Link>
          </p>
        </Async>
      </Panel>

      <Panel title="Instructions and messages">
        <Async q={messages}>
          {!msgs.length ? (
            <p className="text-sm text-muted">No onboarding messages.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {msgs.map(({ message: m, needsResponse, answered }) => (
                <li key={m.id} className="space-y-1 py-2">
                  <p className="text-muted">{when(m.created_at)}</p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  {needsResponse && (
                    <p className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={answered ? 'Response sent' : 'Awaiting your response'}
                        tone={answered ? 'success' : 'warning'}
                      />
                      {!answered && (
                        <Link to={R.application} className="text-coral-ink hover:underline">
                          Respond in Application
                        </Link>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Async>
      </Panel>

      <Panel title="Onboarding history">
        <Async q={history}>
          {!items.length ? (
            <p className="text-sm text-muted">No onboarding activity recorded yet.</p>
          ) : (
            <ol className="divide-y divide-line text-sm">
              {items.map((h, i) => (
                <li key={i} className="py-2">
                  <p className="font-medium">
                    {h.to_label}{' '}
                    <span className="font-normal text-muted">· {when(h.created_at)}</span>
                  </p>
                  {h.note && <p className="whitespace-pre-wrap text-muted">{h.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </Async>
      </Panel>

      <Panel title="Partner lifecycle">
        <Async q={history}>
          <ul className="space-y-2 text-sm">
            {onboardingLifecycle(app, hist).map((l) => (
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
            Onboarding status is decided by Coral Swift staff. Account provisioning and activation
            are separate steps carried out by staff and are not changed from this page.
          </p>
        </Async>
      </Panel>
    </div>
  )
}
