import { ArrowLeft, Check, Circle, RefreshCw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isFinal, ReviewActions } from '@/features/partner-applications/components/ReviewActions'
import { ApplicationStatusBadge } from '@/features/partner-applications/components/StatusBadgeFor'
import {
  useApplicationDetail,
  useAudit,
  useMessages,
  useNotes,
  useReviewers,
} from '@/features/partner-applications/hooks/useApplications'
import {
  Documents,
  Fields,
  Records,
  Section,
} from '@/features/partner-applications/pages/ApplicationDetailPage'
import { formatDateTime, humanize, shortId } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { buildChecklist, checklistProgress, decisionsFrom } from '../utils/derive'

const TABS = [
  'Overview',
  'Documents',
  'Checklist',
  'Notes & requests',
  'Decision & history',
] as const
type Tab = (typeof TABS)[number]

/** Loading / error / empty wrapper shared by the list-style sections. */
function QuerySection<T>({
  title,
  q,
  empty,
  children,
}: {
  title: string
  q: {
    data?: T[]
    isPending: boolean
    isError: boolean
    error: unknown
    refetch: () => unknown
  }
  empty: string
  children: (rows: T[]) => ReactNode
}) {
  return (
    <Section title={title}>
      {q.isError ? (
        <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
      ) : q.data?.length ? (
        children(q.data)
      ) : (
        <EmptyState title={q.isPending ? 'Loading…' : empty} />
      )}
    </Section>
  )
}

const Label = ({ children }: { children: ReactNode }) => (
  <dt className="text-xs uppercase text-muted">{children}</dt>
)

export default function ApplicationReviewWorkspacePage() {
  const { id = '' } = useParams()
  const { user, can } = useAuth()
  const [tab, setTab] = useState<Tab>('Overview')
  const q = useApplicationDetail(id)
  const notes = useNotes(id)
  const messages = useMessages(id)
  const audit = useAudit(id)
  const reviewers = useReviewers(user?.role === 'super_administrator')

  const back = (
    <Button asChild variant="secondary">
      <Link to="..">
        <ArrowLeft className="size-4" aria-hidden /> Review queue
      </Link>
    </Button>
  )
  if (q.isPending)
    return (
      <div className="space-y-4" role="status" aria-label="Loading review workspace">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    )
  if (q.isError || !q.data)
    return (
      <>
        <PageHeader title="Review workspace" actions={back} />
        <Card>
          <ErrorState
            message={q.error ? toAppError(q.error).message : 'Application not found.'}
            onRetry={() => q.refetch()}
          />
        </Card>
      </>
    )

  const d = q.data
  const { application: a, organization: o } = d
  const owner = a.assigned_reviewer_id
  const ownerName = !owner
    ? 'Unassigned'
    : owner === user?.id
      ? 'You'
      : (reviewers.data?.find((r) => r.id === owner)?.full_name ?? `Reviewer ${shortId(owner)}`)
  const items = buildChecklist(d)
  const progress = checklistProgress(items)
  const decisions = decisionsFrom(d.status_history)
  const history = [...d.status_history].sort((x, y) => y.created_at.localeCompare(x.created_at))

  return (
    <>
      <PageHeader
        title={`${a.reference} · ${a.organization_name}`}
        description="Review workspace: examine the submission, record findings and decide."
        actions={
          <>
            {back}
            <Button variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching}>
              <RefreshCw className={q.isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />{' '}
              Refresh
            </Button>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <Label>Status</Label>
              <dd className="mt-0.5">
                <ApplicationStatusBadge status={a.status} />
              </dd>
            </div>
            <div>
              <Label>Reviewer</Label>
              <dd className="mt-0.5">{ownerName}</dd>
            </div>
            <div>
              <Label>Submitted</Label>
              <dd className="mt-0.5">{formatDateTime(a.submitted_at)}</dd>
            </div>
            <div>
              <Label>Last status change</Label>
              <dd className="mt-0.5">{formatDateTime(history[0]?.created_at)}</dd>
            </div>
            <div>
              <Label>Checklist</Label>
              <dd className="mt-0.5">
                {progress.done}/{progress.total}
              </dd>
            </div>
          </dl>
          <ReviewActions app={a} />
        </div>
        {d.open_information_requests > 0 && (
          <p className="mt-3 text-sm text-amber-900">
            {d.open_information_requests} open information request(s) awaiting the partner.
          </p>
        )}
      </Card>

      <div
        role="tablist"
        aria-label="Review sections"
        className="mb-4 flex gap-1 overflow-x-auto border-b border-line"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? 'border-coral-ink text-coral-ink' : 'border-transparent text-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="space-y-4">
        {tab === 'Overview' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Applicant organization">
              <Fields
                items={[
                  ['Legal name', o.legal_name],
                  ['Registration number', o.registration_number],
                  ['Country', o.country],
                  ['Registered address', o.registered_address],
                  ['Website', o.website],
                  ['Pathway', humanize(a.pathway)],
                  ['Submissions', a.submission_count],
                ]}
              />
              <h3 className="mb-2 mt-4 text-xs uppercase text-muted">Authorized contacts</h3>
              <Records rows={o.authorized_contacts} />
            </Section>
            <Section title="Business information & partnership interests">
              <Fields
                items={[
                  [
                    'Service categories (partnership interests)',
                    o.service_categories?.map(humanize).join(', ') ?? null,
                  ],
                  ['Year established', o.year_established],
                  ['Employees', o.employee_count],
                  ['Annual turnover (INR crore)', o.annual_turnover_inr_crore],
                  ['Business description', o.business_description],
                  ['Technical capabilities', o.technical_capabilities],
                  ['Infrastructure', o.infrastructure_summary],
                ]}
              />
              <h3 className="mb-2 mt-4 text-xs uppercase text-muted">Client references</h3>
              <Records rows={o.client_references} />
            </Section>
          </div>
        )}

        {tab === 'Documents' && (
          <Section title="Submitted documents">
            <Documents detail={d} />
          </Section>
        )}

        {tab === 'Checklist' && (
          <Section title={`Review checklist (${progress.done}/${progress.total} complete)`}>
            <p className="mb-3 text-xs text-muted">
              Derived read-only from submitted data: it shows what is present, not whether it is
              acceptable. The backend has no checklist or scoring endpoint; judgements are recorded
              as eligibility verifications, document reviews and notes.
            </p>
            {progress.done < progress.total && (
              <p className="mb-3 text-sm font-medium">
                Incomplete: {progress.total - progress.done} item(s)
              </p>
            )}
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.label} className="flex items-start gap-3 py-2 text-sm">
                  {i.done ? (
                    <Check className="mt-0.5 size-4 text-emerald-700" aria-label="Complete" />
                  ) : (
                    <Circle className="mt-0.5 size-4 text-amber-700" aria-label="Incomplete" />
                  )}
                  <span className="flex-1">
                    <span className="text-xs uppercase text-muted">{i.group}</span>
                    <br />
                    {i.label}
                    {!i.done && i.hint ? <span className="text-muted"> · {i.hint}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="mb-2 mt-5 text-xs uppercase text-muted">Eligibility verifications</h3>
            {d.eligibility_verifications.length ? (
              <ul className="space-y-3 text-sm">
                {d.eligibility_verifications.map((e) => (
                  <li key={e.id} className="rounded border border-line p-3">
                    <p className="font-medium">
                      {humanize(e.outcome)} · submission {e.submission_no}
                    </p>
                    <p className="text-muted">
                      {formatDateTime(e.verified_at)} · by {shortId(e.verified_by)}
                    </p>
                    {e.notes && <p className="mt-1">{e.notes}</p>}
                    {e.exception_note && <p className="mt-1">Exception: {e.exception_note}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No verifications recorded" />
            )}
          </Section>
        )}

        {tab === 'Notes & requests' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <QuerySection
              title="Internal notes (never visible to partners)"
              q={notes}
              empty="No internal notes"
            >
              {(rows) => (
                <ul className="space-y-3 text-sm">
                  {rows.map((n) => (
                    <li key={n.id} className="rounded border border-line p-3">
                      <p className="whitespace-pre-wrap">{n.body}</p>
                      <p className="mt-1 text-xs text-muted">
                        {shortId(n.author_id)} · {formatDateTime(n.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </QuerySection>
            <QuerySection
              title="Information requests & partner replies"
              q={messages}
              empty="No messages"
            >
              {(rows) => (
                <ul className="space-y-3 text-sm">
                  {rows.map((m) => (
                    <li key={m.id} className="rounded border border-line p-3">
                      <p className="text-xs text-muted">
                        {humanize(m.kind)}
                        {m.status ? ` · ${humanize(m.status)}` : ''} ·{' '}
                        {formatDateTime(m.created_at)}
                      </p>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      {m.requested_categories?.length ? (
                        <p className="text-muted">
                          Requested: {m.requested_categories.map(humanize).join(', ')}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </QuerySection>
          </div>
        )}

        {tab === 'Decision & history' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Decision">
              <p className="mb-3 rounded border border-line bg-surface p-3 text-sm">
                A decision does not create a partner account. Approved applicants continue through
                onboarding, and accounts are provisioned only by the documented backend process.
                {can('onboarding') && (
                  <>
                    {' '}
                    <Link className="underline" to={`${ROUTES.admin}/approved-applicants`}>
                      Approved Applicants
                    </Link>
                  </>
                )}
              </p>
              {decisions.length ? (
                <>
                  <Fields
                    items={[
                      ['Current status', humanize(a.status)],
                      ['Latest decision', humanize(decisions[0].to_status)],
                      ['Decision date', formatDateTime(decisions[0].created_at)],
                      [
                        'Decision maker',
                        `${humanize(decisions[0].actor_type)} ${shortId(decisions[0].actor_user_id)}`,
                      ],
                      ['Remarks (reason)', decisions[0].reason],
                      ['Partner note', decisions[0].partner_note],
                    ]}
                  />
                  <p className="mt-3 text-xs text-muted">
                    {decisions.length} decision record(s) in the history. The backend has no
                    separate “approved” status; approval is recorded by moving to a decision stage.
                  </p>
                </>
              ) : (
                <EmptyState title="No decision recorded yet" />
              )}
              {isFinal(a.status) && (
                <p className="mt-3 text-sm font-medium">
                  This application is final. The backend documents no reversal or reconsideration
                  process, so no further stage changes are offered.
                </p>
              )}
            </Section>
            <Section title="Review history">
              {history.length ? (
                <ol className="space-y-3 text-sm">
                  {history.map((h, i) => (
                    <li key={i} className="border-l-2 border-line pl-3">
                      <p className="font-medium">
                        {h.from_status ? `${humanize(h.from_status)} → ` : ''}
                        {humanize(h.to_status)}
                      </p>
                      <p className="text-muted">
                        {formatDateTime(h.created_at)} · {humanize(h.actor_type)}{' '}
                        {shortId(h.actor_user_id)}
                      </p>
                      {h.reason && <p>Reason: {h.reason}</p>}
                      {h.partner_note && <p>Partner note: {h.partner_note}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title="No status changes yet" />
              )}
            </Section>
            <QuerySection title="Audit trail" q={audit} empty="No audit entries">
              {(rows) => (
                <ul className="space-y-2 text-sm">
                  {rows.map((x, i) => (
                    <li key={i}>
                      <span className="font-medium">
                        {humanize(x.action.replace(/[.:]/g, '_'))}
                      </span>
                      <span className="text-muted"> · {formatDateTime(x.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </QuerySection>
          </div>
        )}
      </div>
    </>
  )
}
