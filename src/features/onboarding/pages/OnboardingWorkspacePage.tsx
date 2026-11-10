import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ReviewActions } from '@/features/partner-applications/components/ReviewActions'
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
import { DOC_CATEGORIES } from '@/features/partner-applications/types'
import {
  formatDate,
  formatDateTime,
  humanize,
  shortId,
} from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { ProgressTracker } from '../components/ProgressTracker'
import { ProvisioningPanel } from '../components/ProvisioningPanel'
import { APPROVED_STATUSES } from '../types'
import { contactPrefill, summarizeDocs } from '../utils/derive'

export default function OnboardingWorkspacePage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const q = useApplicationDetail(id)
  const notes = useNotes(id)
  const messages = useMessages(id)
  const audit = useAudit(id)
  const reviewers = useReviewers(user?.role === 'super_administrator')

  const back = (
    <Button asChild variant="secondary">
      <Link to="..">
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
    </Button>
  )
  if (q.isPending)
    return (
      <div className="space-y-4" role="status" aria-label="Loading onboarding workspace">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    )
  if (q.isError || !q.data)
    return (
      <>
        <PageHeader title="Onboarding" actions={back} />
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
  const contact = contactPrefill(o.authorized_contacts)
  const sum = summarizeDocs(d.documents)
  const history = [...d.status_history].sort((x, y) => y.created_at.localeCompare(x.created_at))
  const approvedAt = [...d.status_history]
    .reverse()
    .find((h) => APPROVED_STATUSES.includes(h.to_status))
  const admin = a.assigned_reviewer_id
    ? (reviewers.data?.find((r) => r.id === a.assigned_reviewer_id)?.full_name ??
      shortId(a.assigned_reviewer_id))
    : 'Unassigned'
  const byCategory = new Map(d.documents.map((x) => [x.category, x]))

  return (
    <>
      <PageHeader
        title={`${a.reference} · ${a.organization_name}`}
        description="Onboarding workspace"
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ApplicationStatusBadge status={a.status} />
        <ReviewActions app={a} />
      </div>
      {!APPROVED_STATUSES.includes(a.status) && (
        <p className="mb-4 rounded border border-line bg-surface p-3 text-sm" role="status">
          This application has not reached the onboarding stage, so provisioning is unavailable.
        </p>
      )}

      <Section title="Onboarding progress">
        <ProgressTracker status={a.status} />
      </Section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="A. Applicant information">
          <Fields
            items={[
              ['Contact name', contact.full_name],
              ['Contact email', contact.email],
              ['Organization', o.legal_name],
              ['Registration number', o.registration_number],
              ['Country', o.country],
              ['Registered address', o.registered_address],
              ['Application reference', a.reference],
              ['Approval (stage entered)', approvedAt ? formatDate(approvedAt.created_at) : null],
              ['Approval reason', approvedAt?.reason ?? null],
            ]}
          />
          <h3 className="mb-2 mt-4 text-xs uppercase text-muted">Authorized contacts</h3>
          <Records rows={o.authorized_contacts} />
        </Section>

        <Section title="B. Business information">
          <Fields
            items={[
              ['Pathway', humanize(a.pathway)],
              ['Year established', o.year_established],
              ['Employees', o.employee_count],
              ['Annual turnover (INR crore)', o.annual_turnover_inr_crore],
              ['Service categories', o.service_categories?.map(humanize).join(', ') ?? null],
              ['Business description', o.business_description],
              ['Technical capabilities', o.technical_capabilities],
              ['Infrastructure', o.infrastructure_summary],
              ['Website', o.website],
            ]}
          />
          <h3 className="mb-2 mt-4 text-xs uppercase text-muted">Client references</h3>
          <Records rows={o.client_references} />
        </Section>

        <Section title="C. Onboarding requirements">
          <Fields
            items={[
              ['Assigned administrator', admin],
              ['Documents verified', `${sum.verified} of ${sum.total}`],
              ['Open information requests', d.open_information_requests],
              ['Eligibility verifications', d.eligibility_verifications.length],
            ]}
          />
          <h3 className="mb-2 mt-4 text-xs uppercase text-muted">Document checklist</h3>
          <ul className="space-y-1 text-sm">
            {DOC_CATEGORIES.map((c) => {
              const v = byCategory.get(c)?.current_version
              return (
                <li key={c} className="flex justify-between gap-3">
                  <span>{humanize(c)}</span>
                  <span className={v?.review_status === 'accepted' ? '' : 'text-muted'}>
                    {v ? humanize(v.review_status) : 'Not submitted'}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">
            The backend does not state which categories are mandatory for onboarding.
          </p>
          <h3 className="mb-2 mt-4 text-xs uppercase text-muted">Administrative notes</h3>
          {notes.isError ? (
            <ErrorState message={toAppError(notes.error).message} onRetry={() => notes.refetch()} />
          ) : notes.data?.length ? (
            <ul className="space-y-2 text-sm">
              {notes.data.map((n) => (
                <li key={n.id} className="rounded border border-line p-2">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="text-xs text-muted">
                    {shortId(n.author_id)} · {formatDateTime(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={notes.isPending ? 'Loading…' : 'No notes'} />
          )}
        </Section>

        <Section title="Partner account provisioning">
          <ProvisioningPanel detail={d} />
        </Section>
      </div>

      <div className="mt-4 space-y-4">
        <Section title="D. Documents">
          <Documents detail={d} />
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="E. Progress & status history">
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
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No status changes yet" />
            )}
          </Section>

          <Section title="Onboarding history (audit trail)">
            {audit.isError ? (
              <ErrorState
                message={toAppError(audit.error).message}
                onRetry={() => audit.refetch()}
              />
            ) : audit.data?.length ? (
              <ul className="space-y-2 text-sm">
                {audit.data.map((x, i) => (
                  <li key={i}>
                    <span className="font-medium">{humanize(x.action.replace(/[.:]/g, '_'))}</span>
                    <span className="text-muted"> · {formatDateTime(x.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={audit.isPending ? 'Loading…' : 'No audit entries'} />
            )}
          </Section>

          <Section title="Information requests & partner replies">
            {messages.isError ? (
              <ErrorState
                message={toAppError(messages.error).message}
                onRetry={() => messages.refetch()}
              />
            ) : messages.data?.length ? (
              <ul className="space-y-3 text-sm">
                {messages.data.map((m) => (
                  <li key={m.id} className="rounded border border-line p-3">
                    <p className="text-xs text-muted">
                      {humanize(m.kind)} · {formatDateTime(m.created_at)}
                    </p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={messages.isPending ? 'Loading…' : 'No messages'} />
            )}
          </Section>
        </div>
      </div>
    </>
  )
}
