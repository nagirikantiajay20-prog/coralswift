import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Download, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { FormDialog } from '@/features/partner-applications/components/ReviewActions'
import {
  useAppMutation,
  useApplicationDetail,
  useAudit,
  useNotes,
} from '@/features/partner-applications/hooks/useApplications'
import { partnerApplicationsService as svc } from '@/features/partner-applications/services/partnerApplicationsService'
import { Fields, Section } from '@/features/partner-applications/pages/ApplicationDetailPage'
import { formatDateTime, humanize, shortId } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { DocStatusBadge } from '../components/DocumentParts'
import { useSecureDocument } from '../hooks/useDocuments'
import type { ReviewAction } from '../types'
import { buildReviewPayload, canPreview, formatSize, toDocRow } from '../utils/documents'

const textarea = 'min-h-24 w-full rounded-md border border-line bg-white p-3 text-sm'
const reasonSchema = z.object({
  comment: z.string().trim().min(1, 'A reason is required').max(4000),
})
type ReasonForm = z.infer<typeof reasonSchema>

export default function DocumentWorkspacePage() {
  const { appId = '', docId = '' } = useParams()
  const { can } = useAuth()
  const q = useApplicationDetail(appId)
  const notes = useNotes(appId)
  const audit = useAudit(appId)
  const [action, setAction] = useState<ReviewAction | null>(null)
  const [note, setNote] = useState('')

  const doc = q.data?.documents.find((d) => d.id === docId)
  const row = doc ? toDocRow(appId, doc) : undefined
  const file = useSecureDocument(row)
  const form = useForm<ReasonForm>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { comment: '' },
  })

  const review = useAppMutation(
    async ({ a, comment }: { a: ReviewAction; comment: string }) => {
      const p = buildReviewPayload(a, comment, row?.versionNo ?? null)
      if (!p.ok) throw new Error(p.error)
      return svc.reviewDocument(appId, docId, p.body)
    },
    'Document review saved',
    () => {
      setAction(null)
      form.reset()
    },
  )
  const addNote = useAppMutation(
    (b: string) => svc.addNote(appId, b),
    'Note added',
    () => setNote(''),
  )

  if (q.isPending) return <LoadingState label="Loading document…" />
  if (q.isError)
    return (
      <Card>
        <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
      </Card>
    )
  if (!q.data || !doc || !row)
    return (
      <Card>
        <EmptyState
          title="Document not found"
          description="It may have been removed or belong to another application."
        />
      </Card>
    )

  const canReview = can('applicationReviews') && !!doc.current_version
  // Audit entries are untyped (`meta`); show only those that explicitly reference this document.
  const activity = (audit.data ?? []).filter((a) => a.meta?.document_id === docId)

  return (
    <>
      <Link
        to={`/admin/documents/${appId}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> {q.data.application.reference} documents
      </Link>
      <PageHeader
        title={humanize(row.category)}
        description={`${q.data.application.organization_name} · ${q.data.application.reference}`}
        actions={<DocStatusBadge status={row.reviewStatus} />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Document">
            <Fields
              items={[
                ['File name', row.filename],
                ['Category', humanize(row.category)],
                ['Type', row.contentType],
                ['Size', formatSize(row.size)],
                ['Version', row.versionNo ? `v${row.versionNo}` : null],
                ['Uploaded', formatDateTime(row.uploadedAt)],
                ['Storage status', row.uploadStatus && humanize(row.uploadStatus)],
                ['Expires on', row.expiresOn],
                [
                  'Related application',
                  <Link className="underline" to={`/admin/application-reviews/${appId}`}>
                    {q.data.application.reference}
                  </Link>,
                ],
                ['Record type', 'Partner application'],
              ]}
            />
            {row.reviewComment && (
              <p className="mt-4 rounded border border-line p-3 text-sm">
                <span className="text-muted">Latest review comment: </span>
                {row.reviewComment}
              </p>
            )}
            {file.error && (
              <p role="alert" className="mt-4 text-sm text-rose">
                {file.error}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {canPreview(row.contentType) && (
                <Button variant="secondary" disabled={!!file.busy} onClick={file.preview}>
                  <ExternalLink className="size-4" aria-hidden />{' '}
                  {file.busy === 'preview' ? 'Opening…' : 'Preview'}
                </Button>
              )}
              <Button variant="secondary" disabled={!!file.busy} onClick={file.download}>
                <Download className="size-4" aria-hidden />{' '}
                {file.busy === 'download' ? 'Downloading…' : 'Download'}
              </Button>
            </div>
            {!canPreview(row.contentType) && (
              <p className="mt-2 text-xs text-muted">
                Inline preview is only offered for PDF, PNG and JPEG files.
              </p>
            )}
          </Section>

          <Section title="Review history">
            <p className="mb-3 text-sm text-muted">
              The backend returns only the current version’s review state to staff; a per-document
              history endpoint exists for the partner only.
            </p>
            {activity.length ? (
              <ul className="divide-y divide-line text-sm">
                {activity.map((a, i) => (
                  <li key={i} className="py-2">
                    {humanize(a.action)} · {formatDateTime(a.created_at)} ·{' '}
                    {shortId(a.actor_user_id)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No activity entries reference this document.</p>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Review">
            {canReview ? (
              <div className="flex flex-col gap-2">
                <Button onClick={() => setAction('accept')}>Accept</Button>
                <Button variant="secondary" onClick={() => setAction('request_replacement')}>
                  Request replacement
                </Button>
                <Button variant="danger" onClick={() => setAction('reject')}>
                  Reject
                </Button>
                <p className="text-xs text-muted">
                  Decisions are always manual. Comments are visible to the partner.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">You do not have permission to review documents.</p>
            )}
          </Section>

          <Section title="Application notes">
            {notes.isError ? (
              <p className="text-sm text-muted">{toAppError(notes.error).message}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(notes.data ?? []).map((n) => (
                  <li key={n.id} className="rounded border border-line p-2">
                    {n.body}
                    <span className="block text-xs text-muted">{formatDateTime(n.created_at)}</span>
                  </li>
                ))}
                {!notes.data?.length && <li className="text-muted">No notes.</li>}
              </ul>
            )}
            {canReview && (
              <form
                className="mt-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (note.trim()) addNote.mutate(note.trim())
                }}
              >
                <textarea
                  aria-label="Review note"
                  className={textarea}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button type="submit" size="sm" disabled={!note.trim() || addNote.isPending}>
                  Add note
                </Button>
              </form>
            )}
          </Section>
        </div>
      </div>

      <ConfirmDialog
        open={action === 'accept'}
        onOpenChange={(o) => !o && setAction(null)}
        title="Accept this document?"
        description="This records the document as accepted for the current version."
        confirmLabel="Accept"
        onConfirm={() => review.mutate({ a: 'accept', comment: '' })}
      />
      <FormDialog
        open={action === 'reject' || action === 'request_replacement'}
        onOpenChange={(o) => !o && setAction(null)}
        title={action === 'reject' ? 'Reject document' : 'Request replacement'}
        description="The reason is visible to the partner."
        formId="doc-reason"
        submitLabel={action === 'reject' ? 'Reject document' : 'Request replacement'}
        busy={review.isPending}
      >
        <form
          id="doc-reason"
          onSubmit={form.handleSubmit(
            (v) => action && review.mutate({ a: action, comment: v.comment }),
          )}
        >
          <FormField label="Reason" error={form.formState.errors.comment?.message}>
            <textarea className={textarea} {...form.register('comment')} />
          </FormField>
        </form>
      </FormDialog>
    </>
  )
}
