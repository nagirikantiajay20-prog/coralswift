import { FileText, Inbox, MessageSquare, Send, UserCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/common/states'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'
import { PARTNER_ROUTES as R } from '../config/routes'
import { usePartnerDashboard } from '../hooks/usePartnerDashboard'
import type { PartnerDocument, PartnerMessage, Row } from '../services/partnerDashboardService'
import { infoRequests, statusInfo } from '../utils/applicationStatus'
import { onboardingSummary, partnerActions } from '../utils/onboarding'
import { documentRequests, needsAction, REVIEW_LABEL, STATUS_TONE } from '../utils/documentFiles'
import type { ReviewStatus } from '@/features/partner-applications/types'

const human = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
const reviewLabel = (s: string) => REVIEW_LABEL[s as ReviewStatus] ?? human(s)
const reviewTone = (s: string): StatusTone => STATUS_TONE[s as ReviewStatus] ?? 'neutral'
/** Same status definitions as the Documents module (partner/utils/documentFiles). */
function docSummary(docs: PartnerDocument[], messages: PartnerMessage[] | undefined) {
  const parts = [
    [documentRequests(messages).filter((r) => !r.answered).length, 'document request(s) pending'],
    [docs.filter((x) => x.current_version?.review_status === 'pending').length, 'awaiting review'],
    [docs.filter((x) => needsAction(x.current_version)).length, 'need your attention'],
  ] as const
  const text = parts.filter(([n]) => n > 0).map(([n, t]) => `${n} ${t}`)
  return text.length ? text.join(' · ') : 'No documents need action.'
}
const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '')
/** Untyped backend rows: read the first present string field; never invent a value. */
const field = (row: Row, keys: string[]) => {
  for (const k of keys) if (typeof row[k] === 'string' && row[k]) return row[k] as string
}
interface Q<T> {
  data?: T
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => unknown
}

/** Per-section loading / error (with retry) / content, so one failure never blanks the page. */
function Section<T>({
  title,
  q,
  link,
  children,
}: {
  title: string
  q: Q<T>
  link?: { to: string; label: string }
  children: (d: NonNullable<T>) => ReactNode
}) {
  const err = q.isError ? toAppError(q.error) : null
  return (
    <Card aria-busy={q.isLoading}>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        {link && (
          <Link to={link.to} className="text-sm text-coral-ink hover:underline">
            {link.label}
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div role="status" aria-label={`Loading ${title}`} className="space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface" />
          </div>
        ) : err ? (
          <ErrorState
            message={
              err.status === 403
                ? 'You do not have access to this information.'
                : err.status === 401
                  ? 'Your session has expired. Please sign in again.'
                  : err.message
            }
            onRetry={() => q.refetch()}
          />
        ) : q.data == null ? (
          <EmptyState title="No data available" />
        ) : (
          children(q.data as NonNullable<T>)
        )}
      </CardContent>
    </Card>
  )
}

export default function PartnerDashboardPage() {
  const partner = useAuthStore((s) => s.partner)
  const d = usePartnerDashboard()
  const { app, completion, documents } = d
  const stat = (q: Q<unknown>) => ({ loading: q.isLoading, error: q.isError })
  const open = d.applications.data?.reduce((n, a) => n + a.open_information_requests, 0)

  // Recent activity: partner-visible status history + reviewer messages, newest first.
  const activityPending = d.history.isLoading || d.messages.isLoading
  const activity = [
    ...(d.history.data ?? []).map((h) => ({
      at: h.created_at,
      text: `Status: ${h.to_label}`,
      note: h.note,
    })),
    ...(d.messages.data ?? [])
      .filter((m) => m.from_reviewer)
      .map((m) => ({ at: m.created_at, text: 'Message from reviewer', note: m.body })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6)
  const activityQ: Q<typeof activity> = {
    isLoading: d.applications.isLoading || (!!app && activityPending),
    isError: d.history.isError && d.messages.isError,
    error: d.history.error ?? d.messages.error,
    refetch: () => Promise.all([d.history.refetch(), d.messages.refetch()]),
    data: app ? activity : [],
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">
          Welcome{partner ? `, ${partner.name}` : ''}
        </h1>
        {partner && <p className="text-sm text-muted">{partner.organizationName}</p>}
      </div>

      <section aria-label="Overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Profile completion"
          icon={UserCheck}
          value={completion.data ? `${completion.data.percent}%` : undefined}
          {...stat(completion)}
        />
        <StatCard
          label="Application status"
          icon={Send}
          value={d.applications.data ? (app?.status_label ?? 'No application') : undefined}
          {...stat(d.applications)}
        />
        <StatCard
          label="Open information requests"
          icon={MessageSquare}
          value={open}
          {...stat(d.applications)}
        />
        <StatCard
          label="Documents on file"
          icon={FileText}
          value={documents.data?.length}
          {...stat(documents)}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Company profile completion"
          q={completion}
          link={{ to: R.company, label: 'Update profile' }}
        >
          {(c) => (
            <div className="space-y-3">
              <div
                role="progressbar"
                aria-label="Profile completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={c.percent}
                className="h-2 rounded-full bg-surface"
              >
                <div
                  className="h-2 rounded-full bg-coral-bright"
                  style={{ width: `${Math.min(100, c.percent)}%` }}
                />
              </div>
              <p className="text-sm">{c.percent}% complete</p>
              {c.complete || !c.missing_fields.length ? (
                <p className="text-sm text-muted">No incomplete sections reported.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm">
                  {c.missing_fields.map((f) => (
                    <li key={f}>{human(f)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Section>

        <Section
          title="Application status"
          q={d.applications}
          link={{ to: R.application, label: 'View application' }}
        >
          {() =>
            !app ? (
              <EmptyState title="No application on record" icon={Send} />
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted">Reference </span>
                  {app.reference}
                </p>
                <StatusBadge label={app.status_label} tone={statusInfo(app.status).tone} />
                <p className="text-muted">
                  {app.submitted_at ? `Submitted ${date(app.submitted_at)}` : 'Not yet submitted'}
                </p>
                {d.history.data?.length ? (
                  <p>
                    <span className="text-muted">Latest update </span>
                    {
                      [...d.history.data].sort((a, b) =>
                        b.created_at.localeCompare(a.created_at),
                      )[0].to_label
                    }
                    {' · '}
                    {date(
                      [...d.history.data].sort((a, b) =>
                        b.created_at.localeCompare(a.created_at),
                      )[0].created_at,
                    )}
                  </p>
                ) : null}
                {infoRequests(d.messages.data).filter((r) => !r.answered).length > 0 && (
                  <p>
                    <span className="font-medium">Action needed: </span>
                    respond to {
                      infoRequests(d.messages.data).filter((r) => !r.answered).length
                    }{' '}
                    request(s).{' '}
                    <Link to={R.application} className="text-coral-ink hover:underline">
                      Open application tracking
                    </Link>
                  </p>
                )}
                {app.open_information_requests > 0 && (
                  <p>
                    {app.open_information_requests} open information request(s).{' '}
                    <Link to={R.messages} className="text-coral-ink hover:underline">
                      View messages
                    </Link>
                  </p>
                )}
              </div>
            )
          }
        </Section>

        <Section
          title="Onboarding"
          q={d.applications}
          link={{ to: R.onboarding, label: 'View onboarding' }}
        >
          {() => {
            if (!app) return <EmptyState title="No onboarding on record" />
            const sum = onboardingSummary(app, d.history.data ?? [])
            const todo = partnerActions({
              messages: d.messages.data,
              documents: documents.data,
              completion: completion.data,
            })
            return (
              <div className="space-y-2 text-sm">
                <StatusBadge label={sum.label} tone={sum.tone} />
                <p className="text-muted">{sum.detail}</p>
                {sum.lastUpdatedAt && (
                  <p>
                    <span className="text-muted">Latest update </span>
                    {date(sum.lastUpdatedAt)}
                  </p>
                )}
                {sum.phase !== 'not_started' && sum.phase !== 'closed' && (
                  <p>
                    {todo.length
                      ? `${todo.length} outstanding action(s).`
                      : 'No outstanding actions.'}
                  </p>
                )}
              </div>
            )
          }}
        </Section>

        <Section
          title="Documents"
          q={documents}
          link={{ to: R.documents, label: 'Manage documents' }}
        >
          {(docs) =>
            !docs.length ? (
              <EmptyState title="No documents on file" icon={FileText} />
            ) : (
              <>
                <p role="status" className="mb-2 text-sm text-muted">
                  {docSummary(docs, d.messages.data)}
                </p>
                <ul className="divide-y divide-line text-sm">
                  {docs.slice(0, 5).map((x) => (
                    <li
                      key={x.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <span>{human(x.category)}</span>
                      <span className="flex gap-2">
                        <StatusBadge label={human(x.status)} />
                        {x.current_version && (
                          <StatusBadge
                            label={reviewLabel(x.current_version.review_status)}
                            tone={reviewTone(x.current_version.review_status)}
                          />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )
          }
        </Section>

        <Section title="Recent activity" q={activityQ}>
          {(items) =>
            !items.length ? (
              <EmptyState title="No recent activity" />
            ) : (
              <ul className="divide-y divide-line text-sm">
                {items.map((a, i) => (
                  <li key={i} className="py-2">
                    <p className="font-medium">
                      {a.text} <span className="font-normal text-muted">· {date(a.at)}</span>
                    </p>
                    {a.note && <p className="line-clamp-2 text-muted">{a.note}</p>}
                  </li>
                ))}
              </ul>
            )
          }
        </Section>

        <Section
          title="Recent notifications"
          q={d.notifications}
          link={{ to: R.notifications, label: 'View all' }}
        >
          {(rows) =>
            !rows.length ? (
              <EmptyState title="No notifications" />
            ) : (
              <ul className="divide-y divide-line text-sm">
                {rows.map((n, i) => (
                  <li key={i} className="flex justify-between gap-2 py-2">
                    <span>{human(field(n, ['type', 'template', 'subject']) ?? 'Email')}</span>
                    <span className="text-muted">
                      {[field(n, ['status']), date(field(n, ['created_at', 'sent_at']))]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            )
          }
        </Section>

        <Section
          title="Enquiry history"
          q={d.enquiries}
          link={{ to: R.enquiries, label: 'View enquiries' }}
        >
          {(rows) =>
            !rows.length ? (
              <EmptyState title="No enquiries" icon={Inbox} />
            ) : (
              <ul className="divide-y divide-line text-sm">
                {rows.slice(0, 5).map((e, i) => {
                  const kind = field(e, ['enquiry_type', 'type'])
                  return (
                    <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>
                        {field(e, ['reference_number', 'reference', 'id']) ?? 'Enquiry'}
                        {kind ? ` · ${human(kind)}` : ''}
                      </span>
                      <span className="text-muted">
                        {[field(e, ['status']), date(field(e, ['created_at']))]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )
          }
        </Section>
      </div>
    </div>
  )
}
