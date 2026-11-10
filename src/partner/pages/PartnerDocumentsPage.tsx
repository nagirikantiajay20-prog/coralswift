import { FileText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DOC_CATEGORIES, type ReviewStatus } from '@/features/partner-applications/types'
import { toAppError } from '@/services/api/errors'
import { DocumentHistoryDialog } from '../components/DocumentHistoryDialog'
import { DocumentUploadDialog, type UploadTarget } from '../components/DocumentUploadDialog'
import { PARTNER_ROUTES as R } from '../config/routes'
import { usePartnerDocuments, useSecureDownload } from '../hooks/usePartnerDocuments'
import type { PartnerDocument } from '../services/partnerDocumentService'
import {
  canModify,
  canPreview,
  CATEGORY_GROUPS,
  categoryLabel,
  documentRequests,
  formatSize,
  needsAction,
  REVIEW_LABEL,
  STATUS_TONE,
  type DocRequest,
} from '../utils/documentFiles'

const date = (s: string) => new Date(s).toLocaleDateString()
const human = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

export default function PartnerDocumentsPage() {
  const d = usePartnerDocuments()
  const dl = useSecureDownload()
  const [upload, setUpload] = useState<UploadTarget | null>(null)
  const [history, setHistory] = useState<{ id: string; title: string } | null>(null)
  const [removing, setRemoving] = useState<PartnerDocument | null>(null)
  const [responding, setResponding] = useState<DocRequest | null>(null)

  if (d.documents.isLoading) return <LoadingState label="Loading documents…" />
  if (d.documents.isError) {
    const e = toAppError(d.documents.error)
    return (
      <ErrorState
        message={e.status === 403 ? 'You do not have access to documents.' : e.message}
        onRetry={() => void d.documents.refetch()}
      />
    )
  }

  const docs = d.documents.data ?? []
  const byCategory = (c: string) => docs.filter((x) => x.category === c)
  const known = new Set<string>(DOC_CATEGORIES)
  const others = docs.filter((x) => !known.has(x.category))
  const attention = docs.filter((x) => needsAction(x.current_version))
  const pending = docs.filter((x) => x.current_version?.review_status === 'pending')
  const requests = documentRequests(d.messages.data).filter((r) => !r.answered)

  const startUpload = (category: string) => {
    const existing = byCategory(category)[0]
    setUpload({ category, documentId: existing?.id })
  }

  const row = (category: string, doc?: PartnerDocument) => {
    const v = doc?.current_version
    const rs = v?.review_status as ReviewStatus | undefined
    return (
      <li key={doc?.id ?? category} className="space-y-2 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">{categoryLabel(category)}</p>
          {v ? (
            <StatusBadge
              label={rs && REVIEW_LABEL[rs] ? REVIEW_LABEL[rs] : human(v.review_status)}
              tone={rs ? STATUS_TONE[rs] : 'neutral'}
            />
          ) : (
            <StatusBadge label="Not submitted" />
          )}
        </div>
        {v && (
          <dl className="grid gap-x-6 gap-y-1 text-muted sm:grid-cols-2">
            <div>
              File: <span className="text-navy">{v.original_filename}</span>
            </div>
            <div>
              Type: {v.content_type.split('/').pop()} · {formatSize(v.file_size)}
            </div>
            <div>
              Submitted: {date(v.uploaded_at)} (version {v.version_no})
            </div>
            <div>File check: {human(v.upload_status)}</div>
            {v.expires_on && <div>Expires: {date(v.expires_on)}</div>}
          </dl>
        )}
        {v?.review_comment && needsAction(v) && (
          <p className="rounded-md bg-amber-50 p-2 text-amber-900">
            Reviewer message: {v.review_comment}
          </p>
        )}
        {v?.review_comment && !needsAction(v) && (
          <p className="text-muted">Reviewer message: {v.review_comment}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {!doc && (
            <Button size="sm" onClick={() => startUpload(category)}>
              Upload
            </Button>
          )}
          {doc && v && (
            <>
              {canPreview(v.content_type) && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={dl.busy}
                  onClick={() => void dl.preview(doc.id, v)}
                >
                  Preview
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                disabled={dl.busy}
                onClick={() => void dl.download(doc.id, v)}
              >
                Download
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setHistory({ id: doc.id, title: categoryLabel(category) })}
              >
                History
              </Button>
              {canModify(doc) && (
                <>
                  <Button size="sm" onClick={() => setUpload({ category, documentId: doc.id })}>
                    {needsAction(v) ? 'Upload replacement' : 'Replace'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(doc)}>
                    Remove
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Private company documents. Only you and authorised Coral Swift reviewers can open them."
      />

      {(attention.length > 0 || pending.length > 0) && (
        <p role="status" className="rounded-md bg-surface p-3 text-sm">
          {attention.length > 0 && <>{attention.length} document(s) need your attention. </>}
          {pending.length > 0 && <>{pending.length} document(s) awaiting review.</>}
        </p>
      )}

      {requests.length > 0 && (
        <Card aria-label="Additional document requests">
          <CardHeader>
            <CardTitle>Additional document requests</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-line">
            {requests.map((r) => (
              <div key={r.message.id} className="space-y-2 py-3 text-sm">
                <p className="text-muted">Requested {date(r.message.created_at)}</p>
                <p className="whitespace-pre-line">{r.message.body}</p>
                <ul className="flex flex-wrap gap-2">
                  {r.categories.map((c) => (
                    <li key={c}>
                      <Button size="sm" variant="secondary" onClick={() => startUpload(c)}>
                        {byCategory(c).length ? 'Replace' : 'Upload'} {categoryLabel(c)}
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="ghost" onClick={() => setResponding(r)}>
                  Send response to reviewer
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {d.messages.isError && (
        <p role="alert" className="text-sm text-muted">
          Document requests could not be loaded.{' '}
          <button className="underline" onClick={() => void d.messages.refetch()}>
            Retry
          </button>
        </p>
      )}

      {!docs.length && (
        <Card>
          <EmptyState
            title="No documents uploaded yet"
            description="Upload the items below to support your partner application."
            icon={FileText}
          />
        </Card>
      )}

      {CATEGORY_GROUPS.map((g) => (
        <Card key={g.title} aria-label={g.title}>
          <CardHeader>
            <CardTitle>{g.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {g.categories.flatMap((c) =>
                byCategory(c).length ? byCategory(c).map((x) => row(c, x)) : [row(c)],
              )}
            </ul>
          </CardContent>
        </Card>
      ))}
      {others.length > 0 && (
        <Card aria-label="Other documents">
          <CardHeader>
            <CardTitle>Other documents</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">{others.map((x) => row(x.category, x))}</ul>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted">
        Some items (workforce, infrastructure, client references and authorized contacts) are also
        captured in your{' '}
        <Link to={R.company} className="underline">
          company profile
        </Link>
        . Accepted documents are locked; contact your reviewer if one needs to change. Files are
        accepted as PDF, PNG, JPG, DOCX or XLSX; the server enforces type, size and content checks.
      </p>

      <DocumentUploadDialog target={upload} onClose={() => setUpload(null)} onDone={d.refresh} />
      <DocumentHistoryDialog doc={history} onClose={() => setHistory(null)} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove this document?"
        description={`${removing ? categoryLabel(removing.category) : ''} will be removed from your documents. Reviewers may still retain it for audit.`}
        confirmLabel="Remove document"
        destructive
        onConfirm={() => removing && d.remove.mutate(removing.id)}
      />
      <RespondDialog
        request={responding}
        sending={d.respond.isPending}
        onClose={() => setResponding(null)}
        onSend={(body) =>
          responding &&
          d.respond.mutate(
            { inReplyTo: responding.message.id, body },
            { onSuccess: () => setResponding(null) },
          )
        }
      />
    </div>
  )
}

function RespondDialog({
  request,
  sending,
  onClose,
  onSend,
}: {
  request: DocRequest | null
  sending: boolean
  onClose: () => void
  onSend: (body: string) => void
}) {
  const [text, setText] = useState('')
  const body = text.trim()
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      {request && (
        <DialogContent
          title="Respond to reviewer"
          description="Tell the reviewer what you have provided. This is visible to Coral Swift staff."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={!body || sending} onClick={() => onSend(body)}>
                {sending ? 'Sending…' : 'Send response'}
              </Button>
            </>
          }
        >
          <label className="block text-sm font-medium">
            Your response
            <textarea
              value={text}
              maxLength={4000}
              rows={5}
              onChange={(e) => setText(e.target.value)}
              className="mt-1 w-full rounded-md border border-line p-2 font-normal"
            />
          </label>
        </DialogContent>
      )}
    </Dialog>
  )
}
