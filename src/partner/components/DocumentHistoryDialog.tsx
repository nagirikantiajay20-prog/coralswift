import { ErrorState, LoadingState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { ReviewStatus } from '@/features/partner-applications/types'
import { toAppError } from '@/services/api/errors'
import { useDocumentHistory, useSecureDownload } from '../hooks/usePartnerDocuments'
import { formatSize, REVIEW_LABEL, STATUS_TONE } from '../utils/documentFiles'

export function DocumentHistoryDialog({
  doc,
  onClose,
}: {
  doc: { id: string; title: string } | null
  onClose: () => void
}) {
  const q = useDocumentHistory(doc?.id)
  const dl = useSecureDownload()
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      {doc && (
        <DialogContent title="Version history" description={doc.title}>
          {q.isLoading ? (
            <LoadingState />
          ) : q.isError ? (
            <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
          ) : !q.data?.length ? (
            <p className="text-sm text-muted">No versions recorded.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {q.data.map((v) => (
                <li key={v.version_no} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      Version {v.version_no} · {v.original_filename}
                    </span>
                    <StatusBadge
                      label={REVIEW_LABEL[v.review_status as ReviewStatus] ?? v.review_status}
                      tone={STATUS_TONE[v.review_status as ReviewStatus]}
                    />
                  </div>
                  <p className="text-muted">
                    {new Date(v.uploaded_at).toLocaleDateString()} · {formatSize(v.file_size)}
                  </p>
                  {v.review_comment && <p>Reviewer note: {v.review_comment}</p>}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={dl.busy}
                    onClick={() => void dl.download(doc.id, v)}
                  >
                    Download version {v.version_no}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
