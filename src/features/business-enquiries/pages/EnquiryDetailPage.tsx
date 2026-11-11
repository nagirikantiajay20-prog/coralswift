import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Fields, Section } from '@/features/partner-applications/pages/ApplicationDetailPage'
import {
  formatDate,
  formatDateTime,
  humanize,
  shortId,
} from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { EnquiryDocuments } from '../components/EnquiryDocuments'
import { EnquiryActivity } from '../components/EnquiryActivity'
import { EnquiryActions } from '../components/EnquiryActions'
import { EnquiryStatusBadge, PriorityBadge } from '../components/EnquiryBadges'
import { useEnquiryDetail, useEnquiryMutation } from '../hooks/useEnquiries'
import { businessEnquiriesService as svc } from '../services/businessEnquiriesService'
import type { EnquiryDetail, Priority } from '../types'
import { projectGroup, scalarEntries } from '../utils/format'

const field = (o: Record<string, unknown> | null | undefined): [string, string][] =>
  scalarEntries(o).map(([k, v]) => [humanize(k), String(v)])

/** Document keys are untyped in the spec: id is required for download, a filename key is used if present. */
const docName = (d: Record<string, unknown>) => {
  for (const k of ['original_filename', 'filename', 'file_name', 'name']) {
    if (typeof d[k] === 'string') return d[k] as string
  }
  return typeof d.id === 'string' ? `Attachment ${shortId(d.id)}` : 'Attachment'
}

export function Attachments({ id, docs }: { id: string; docs: EnquiryDetail['documents'] }) {
  const [busy, setBusy] = useState<string | null>(null)
  if (!docs.length) return <EmptyState title="No attachments" />
  const open = async (doc: string) => {
    setBusy(doc)
    try {
      const url = URL.createObjectURL(await svc.download(id, doc))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      toast.error(toAppError(e).message)
    } finally {
      setBusy(null)
    }
  }
  return (
    <ul className="divide-y divide-line">
      {docs.map((d, i) => {
        const did = typeof d.id === 'string' ? d.id : null
        return (
          <li key={did ?? i} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="break-all text-sm">{docName(d)}</span>
            {did && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy === did}
                onClick={() => open(did)}
              >
                <Download className="size-4" aria-hidden /> {busy === did ? 'Opening…' : 'Download'}
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function FollowUps({ d }: { d: EnquiryDetail }) {
  const { user } = useAuth()
  const done = useEnquiryMutation(
    (fu: string) => svc.completeFollowUp(d.enquiry.id, fu),
    'Follow-up completed',
  )
  if (!d.follow_ups.length) return <EmptyState title="No notes or follow-ups yet" />
  return (
    <ul className="space-y-3">
      {[...d.follow_ups]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((f) => (
          <li key={f.id} className="rounded border border-line p-3 text-sm">
            <p className="whitespace-pre-wrap break-words">{f.note}</p>
            <p className="mt-2 text-xs text-muted">
              {formatDateTime(f.created_at)} · by{' '}
              {f.author_id === user?.id ? 'you' : shortId(f.author_id)}
              {f.due_at && ` · due ${formatDate(f.due_at)}`}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {f.completed_at ? (
                <StatusBadge tone="success" label={`Completed ${formatDate(f.completed_at)}`} />
              ) : f.due_at ? (
                <>
                  <StatusBadge tone="warning" label="Open task" />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={done.isPending}
                    onClick={() => done.mutate(f.id)}
                  >
                    Mark complete
                  </Button>
                </>
              ) : (
                <StatusBadge label="Note" />
              )}
            </div>
          </li>
        ))}
    </ul>
  )
}

export default function EnquiryDetailPage() {
  const { id = '' } = useParams()
  const { can } = useAuth()
  const q = useEnquiryDetail(id)
  const back = (
    <Button asChild variant="secondary">
      <Link to="/admin/enquiries">
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
    </Button>
  )
  if (q.isPending) return <LoadingState label="Loading enquiry…" />
  if (q.isError)
    return (
      <>
        {back}
        <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
      </>
    )
  const d = q.data
  const e = d.enquiry
  // Defence in depth: never render confidential strategic records for roles without access.
  if (e.enquiry_type === 'strategic' && !can('strategicEnquiries'))
    return (
      <>
        {back}
        <EmptyState
          title="Restricted record"
          description="Strategic / M&A enquiries are confidential and limited to authorised roles."
        />
      </>
    )
  const group = projectGroup(d.details)
  // Contact / company / details are free-form objects: show what the backend returns, nothing assumed.
  const contact = field(d.contact)
  const company = field(d.company)
  const details = field(d.details)

  return (
    <>
      <PageHeader
        title={e.reference_number}
        description={e.subject ?? 'Enquiry'}
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
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <EnquiryStatusBadge status={e.status} />
        <PriorityBadge priority={e.priority as Priority} />
        <StatusBadge label={humanize(e.enquiry_type)} tone="info" />
        {group && <StatusBadge label={`${group} project`} tone="neutral" />}
      </div>
      <div className="mb-6">
        <EnquiryActions enquiry={e} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="A. Contact information">
          <Fields
            items={[
              ['Name', e.contact_name],
              ['Email', e.contact_email],
              ['Organization', e.company_name],
              ...contact.filter(([k]) => !['Name', 'Email', 'Full name'].includes(k)),
              ...company,
            ]}
          />
        </Section>
        <Section title="B. Enquiry information">
          <Fields
            items={[
              ['Reference', e.reference_number],
              ['Type', humanize(e.enquiry_type)],
              ['Subject', e.subject],
              ['Source', e.source],
              ['Submitted', formatDateTime(e.created_at)],
            ]}
          />
          {d.message && (
            <div className="mt-4">
              <p className="text-xs uppercase text-muted">Message</p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{d.message}</p>
            </div>
          )}
        </Section>
        <Section title="C. Project information">
          {details.length ? (
            <Fields items={details} />
          ) : (
            <EmptyState title="No project details recorded for this enquiry" />
          )}
          <h3 className="mb-1 mt-5 text-sm font-medium">Attachments</h3>
          <EnquiryDocuments id={e.id} />
        </Section>
        <Section title="D. Assignment information">
          <Fields
            items={[
              ['Assigned to', e.assigned_user_id ? shortId(e.assigned_user_id) : 'Unassigned'],
              ['Next follow-up', formatDate(e.next_follow_up_at)],
            ]}
          />
          <p className="mt-3 text-xs text-muted">Assignment history is listed under section F.</p>
        </Section>
      </div>
      <div className="mt-4">
        <Section title="E. Notes, follow-ups and activity">
          <FollowUps d={d} />
        </Section>
      </div>
      <div className="mt-4">
        <Section title="F. Status and assignment history">
          <EnquiryActivity id={e.id} />
        </Section>
      </div>
    </>
  )
}
