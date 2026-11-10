import { ArrowLeft, RefreshCw, ShieldOff } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { EnquiryActions } from '@/features/business-enquiries/components/EnquiryActions'
import {
  EnquiryStatusBadge,
  PriorityBadge,
} from '@/features/business-enquiries/components/EnquiryBadges'
import { useEnquiryDetail } from '@/features/business-enquiries/hooks/useEnquiries'
import { Attachments, FollowUps } from '@/features/business-enquiries/pages/EnquiryDetailPage'
import type { Priority } from '@/features/business-enquiries/types'
import { scalarEntries } from '@/features/business-enquiries/utils/format'
import { Fields, Section } from '@/features/partner-applications/pages/ApplicationDetailPage'
import {
  formatDate,
  formatDateTime,
  humanize,
  shortId,
} from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { ConfidentialBanner } from '../components/ConfidentialBanner'
import { strategicEntries } from '../utils/strategic'

const BASE = '/admin/strategic-enquiries'
const text = (v: string) => <span className="whitespace-pre-wrap break-words">{v}</span>
const extra = (o: Record<string, unknown> | null): [string, string][] =>
  scalarEntries(o).map(([k, v]) => [humanize(k), String(v)])

export default function StrategicEnquiryDetailPage() {
  const { id = '' } = useParams()
  const q = useEnquiryDetail(id)
  const back = (
    <Button asChild variant="secondary">
      <Link to={BASE}>
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
    </Button>
  )
  if (q.isPending) return <LoadingState label="Loading confidential enquiry…" />
  if (q.isError) {
    const err = toAppError(q.error)
    return (
      <>
        {back}
        {err.status === 403 ? (
          <EmptyState
            icon={ShieldOff}
            title="Access denied"
            description={err.message || 'You are not authorized to view this strategic enquiry.'}
          />
        ) : (
          <ErrorState message={err.message} onRetry={() => q.refetch()} />
        )}
      </>
    )
  }
  const d = q.data
  const e = d.enquiry
  if (e.enquiry_type !== 'strategic')
    return (
      <>
        {back}
        <EmptyState
          title="Not a strategic enquiry"
          description="Open it from Business Enquiries."
        />
      </>
    )
  const strategic = strategicEntries(d.details)

  return (
    <>
      <PageHeader
        title={e.reference_number}
        description={e.subject ?? 'Strategic enquiry'}
        actions={
          <>
            {back}
            <Button variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching}>
              <RefreshCw className={q.isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
              Refresh
            </Button>
          </>
        }
      />
      <ConfidentialBanner />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <EnquiryStatusBadge status={e.status} />
        <PriorityBadge priority={e.priority as Priority} />
        <StatusBadge label="Confidential" tone="danger" />
      </div>
      <div className="mb-6">
        <EnquiryActions enquiry={e} module="strategicEnquiries" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="A. Organization information">
          <Fields items={[['Organization', e.company_name], ...extra(d.company)]} />
        </Section>
        <Section title="B. Contact information">
          <Fields
            items={[
              ['Contact person', e.contact_name],
              ['Email', e.contact_email],
              ...extra(d.contact).filter(([k]) => !['Name', 'Email', 'Full name'].includes(k)),
            ]}
          />
        </Section>
        <Section title="C. Strategic information">
          {d.message && <div className="mb-4">{text(d.message)}</div>}
          {strategic.length ? (
            <Fields items={strategic.map(([k, v]) => [k, text(v)])} />
          ) : (
            !d.message && <EmptyState title="No strategic details returned for this enquiry" />
          )}
          <h3 className="mb-1 mt-5 text-sm font-medium">Attachments (restricted, audited)</h3>
          <Attachments id={e.id} docs={d.documents} />
        </Section>
        <Section title="D. Management information">
          <Fields
            items={[
              [
                'Assigned administrator',
                e.assigned_user_id ? shortId(e.assigned_user_id) : 'Unassigned',
              ],
              ['Current status', humanize(e.status)],
              ['Submitted', formatDateTime(e.created_at)],
              ['Next follow-up', formatDate(e.next_follow_up_at)],
            ]}
          />
          <p className="mt-3 text-xs text-muted">
            Review history, assessment outcomes and assignee names are not returned by the backend.
          </p>
        </Section>
      </div>
      <div className="mt-4">
        <Section title="E. Notes, discussions and follow-ups (internal, confidential)">
          <FollowUps d={d} />
          <p className="mt-3 text-xs text-muted">
            Notes, discussions and follow-ups share one backend resource (a note has no due date).
            Status-change, decision and communication history endpoints do not exist yet.
          </p>
        </Section>
      </div>
    </>
  )
}
