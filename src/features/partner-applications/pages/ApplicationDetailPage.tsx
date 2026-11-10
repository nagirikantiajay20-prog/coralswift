import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toAppError } from '@/services/api/errors'
import { ApplicationStatusBadge } from '../components/StatusBadgeFor'
import { DocumentReviewButton, ReviewActions } from '../components/ReviewActions'
import {
  useApplicationDetail,
  useAudit,
  useMessages,
  useNotes,
  useReviewers,
} from '../hooks/useApplications'
import { partnerApplicationsService as svc } from '../services/partnerApplicationsService'
import type { ApplicationDocument, ReviewDetail } from '../types'
import { formatDate, formatDateTime, humanize, shortId } from '../utils/format'
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="border-b border-line px-5 py-3 text-base font-semibold">{title}</h2>
      <div className="p-5">{children}</div>
    </Card>
  )
}

export function Fields({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs uppercase text-muted">{k}</dt>
          <dd className="mt-0.5 break-words text-sm">{v === null || v === '' ? '—' : v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Renders free-form backend objects (authorized_contacts / client_references) without assuming keys. */
export function Records({ rows }: { rows: Record<string, unknown>[] | null }) {
  if (!rows?.length) return <span>—</span>
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={i} className="rounded border border-line p-2 text-sm">
          {Object.entries(r)
            .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
            .map(([k, v]) => (
              <div key={k}>
                <span className="text-muted">{humanize(k)}: </span>
                {String(v)}
              </div>
            ))}
        </li>
      ))}
    </ul>
  )
}

export function Documents({ detail }: { detail: ReviewDetail }) {
  const appId = detail.application.id
  const [busy, setBusy] = useState<string | null>(null)
  const open = async (d: ApplicationDocument) => {
    setBusy(d.id)
    try {
      const blob = await svc.downloadDocument(appId, d.id, d.current_version?.version_no)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      toast.error(toAppError(e).message)
    } finally {
      setBusy(null)
    }
  }
  if (!detail.documents.length) return <EmptyState title="No documents submitted" />
  return (
    <ul className="divide-y divide-line">
      {detail.documents.map((d) => {
        const v = d.current_version
        return (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0 text-sm">
              <p className="font-medium">{humanize(d.category)}</p>
              <p className="break-all text-muted">
                {v
                  ? `${v.original_filename} · v${v.version_no} · uploaded ${formatDate(v.uploaded_at)}`
                  : 'No file uploaded'}
              </p>
              {v && (
                <p className="text-muted">
                  Verification: {humanize(v.review_status)}
                  {v.review_comment ? ` — ${v.review_comment}` : ''}
                </p>
              )}
            </div>
            {v && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy === d.id}
                  onClick={() => open(d)}
                >
                  <Download className="size-4" aria-hidden />{' '}
                  {busy === d.id ? 'Opening…' : 'Download'}
                </Button>
                <DocumentReviewButton appId={appId} doc={d} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function ApplicationDetailPage() {
  const { id = '' } = useParams()
  const { user, can } = useAuth()
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
      <div className="space-y-4" role="status" aria-label="Loading application">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    )
  if (q.isError || !q.data)
    return (
      <>
        <PageHeader title="Application" actions={back} />
        <Card>
          <ErrorState
            message={q.error ? toAppError(q.error).message : 'Application not found.'}
            onRetry={() => q.refetch()}
          />
        </Card>
      </>
    )

  const { application: a, organization: o } = q.data
  const reviewer = a.assigned_reviewer_id
    ? (reviewers.data?.find((r) => r.id === a.assigned_reviewer_id)?.full_name ??
      shortId(a.assigned_reviewer_id))
    : 'Unassigned'
  const lastUpdated = q.data.status_history.at(-1)?.created_at
  const history = [...q.data.status_history].sort((x, y) =>
    y.created_at.localeCompare(x.created_at),
  )

  return (
    <>
      <PageHeader
        title={`${a.reference} · ${a.organization_name}`}
        description="Review the submission, then act using the controls below."
        actions={
          <>
            {back}
            {can('applicationReviews') && (
              <Button asChild variant="secondary">
                <Link to={`${ROUTES.admin}/application-reviews/${a.id}`}>
                  Open review workspace
                </Link>
              </Button>
            )}
            <Button variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching}>
              <RefreshCw className={q.isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />{' '}
              Refresh
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <ApplicationStatusBadge status={a.status} />
          {q.data.open_information_requests > 0 && (
            <span className="text-amber-900">
              {q.data.open_information_requests} open information request(s)
            </span>
          )}
        </div>
        <ReviewActions app={a} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Application information">
          <Fields
            items={[
              ['Reference', a.reference],
              ['Current status', humanize(a.status)],
              ['Pathway', humanize(a.pathway)],
              ['Submitted', formatDateTime(a.submitted_at)],
              ['Submission count', a.submission_count],
              ['Assigned reviewer', reviewer],
              ['Last status change', formatDateTime(lastUpdated)],
            ]}
          />
        </Section>

        <Section title="Applicant organization">
          <Fields
            items={[
              ['Legal name', o.legal_name],
              ['Registration number', o.registration_number],
              ['Country', o.country],
              ['Registered address', o.registered_address],
              ['Website', o.website],
              ['Organization status', humanize(o.status)],
            ]}
          />
          <h3 className="mb-2 mt-4 text-xs uppercase text-muted">Authorized contacts</h3>
          <Records rows={o.authorized_contacts} />
        </Section>

        <Section title="Business information">
          <Fields
            items={[
              ['Year established', o.year_established],
              ['Employees', o.employee_count],
              ['Annual turnover (INR crore)', o.annual_turnover_inr_crore],
              ['Service categories', o.service_categories?.map(humanize).join(', ') ?? null],
              ['Business description', o.business_description],
              ['Technical capabilities', o.technical_capabilities],
              ['Infrastructure', o.infrastructure_summary],
            ]}
          />
          <h3 className="mb-2 mt-4 text-xs uppercase text-muted">Client references</h3>
          <Records rows={o.client_references} />
        </Section>

        <Section title="Eligibility verifications">
          {q.data.eligibility_verifications.length ? (
            <ul className="space-y-3 text-sm">
              {q.data.eligibility_verifications.map((e) => (
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
      </div>

      <div className="mt-4 space-y-4">
        <Section title="Submitted documents">
          <Documents detail={q.data} />
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Status history">
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

          <Section title="Internal notes">
            {notes.isError ? (
              <ErrorState
                message={toAppError(notes.error).message}
                onRetry={() => notes.refetch()}
              />
            ) : notes.data?.length ? (
              <ul className="space-y-3 text-sm">
                {notes.data.map((n) => (
                  <li key={n.id} className="rounded border border-line p-3">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-xs text-muted">
                      {shortId(n.author_id)} · {formatDateTime(n.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={notes.isPending ? 'Loading…' : 'No internal notes'} />
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
                      {humanize(m.kind)}
                      {m.status ? ` · ${humanize(m.status)}` : ''} · {formatDateTime(m.created_at)}
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
            ) : (
              <EmptyState title={messages.isPending ? 'Loading…' : 'No messages'} />
            )}
          </Section>

          <Section title="Audit trail">
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
        </div>
      </div>
    </>
  )
}
