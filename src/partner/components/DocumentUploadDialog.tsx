import { Loader2, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { partnerDocumentService as svc } from '../services/partnerDocumentService'
import {
  ACCEPT,
  categoryLabel,
  formatSize,
  FORMATS_TEXT,
  isCancel,
  uploadErrorMessage,
  validateFile,
} from '../utils/documentFiles'

export interface UploadTarget {
  category: string
  /** Present when replacing: uploads a new version of this document (old versions are kept). */
  documentId?: string
  /** Document request this upload fulfils (new uploads only). */
  requestId?: string
}

/** Select / drop a file, validate, upload with progress, cancel and retry. Backend is authoritative. */
export function DocumentUploadDialog({
  target,
  onClose,
  onDone,
}: {
  target: UploadTarget | null
  onClose: () => void
  onDone: () => void
}) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      {target && (
        <Body
          key={`${target.category}:${target.documentId}:${target.requestId}`}
          {...{ target, onClose, onDone }}
        />
      )}
    </Dialog>
  )
}

function Body({
  target,
  onClose,
  onDone,
}: {
  target: UploadTarget
  onClose: () => void
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [expires, setExpires] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const uploading = progress !== null
  const replacing = !!target.documentId

  const pick = (f: File | undefined) => {
    if (!f) return
    setFailed(false)
    const bad = validateFile(f)
    setError(bad)
    setFile(bad ? null : f)
  }

  const submit = async () => {
    if (!file || uploading) return
    const ctl = (abort.current = new AbortController())
    setError(null)
    setFailed(false)
    setProgress(0)
    const o = {
      requestId: target.requestId,
      expiresOn: expires || undefined,
      signal: ctl.signal,
      onProgress: setProgress,
    }
    try {
      if (target.documentId) await svc.replace(target.documentId, file, o)
      else await svc.upload(file, target.category, o)
      toast.success(replacing ? 'New version uploaded' : 'Document uploaded')
      onDone()
      onClose()
    } catch (e) {
      if (isCancel(e)) setError('Upload cancelled.')
      else {
        setError(uploadErrorMessage(e))
        setFailed(true)
      }
      setProgress(null)
    }
  }

  return (
    <DialogContent
      title={`${replacing ? 'Replace' : 'Upload'}: ${categoryLabel(target.category)}`}
      description={`${FORMATS_TEXT}. Files are stored privately and checked by the server.`}
      footer={
        <>
          {uploading ? (
            <Button variant="secondary" onClick={() => abort.current?.abort()}>
              Cancel upload
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
          <Button onClick={() => void submit()} disabled={!file || uploading}>
            {uploading && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {uploading
              ? 'Uploading…'
              : failed
                ? 'Retry'
                : replacing
                  ? 'Upload new version'
                  : 'Upload'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (!uploading) pick(e.dataTransfer.files[0])
          }}
          className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line p-6 text-center"
        >
          <UploadCloud className="size-8 text-muted" aria-hidden />
          <p className="text-sm">Drag a file here, or</p>
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            aria-label="Choose file"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => input.current?.click()}
          >
            Choose file
          </Button>
          {file && (
            <p className="text-sm font-medium" data-testid="selected-file">
              {file.name} <span className="font-normal text-muted">({formatSize(file.size)})</span>
            </p>
          )}
        </div>

        <label className="block text-sm">
          <span className="font-medium">Document expiry date (optional)</span>
          <input
            type="date"
            value={expires}
            disabled={uploading}
            onChange={(e) => setExpires(e.target.value)}
            className="mt-1 block h-10 w-full rounded-md border border-line px-3"
          />
        </label>

        {uploading && (
          <div>
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-2 rounded-full bg-surface"
            >
              <div className="h-2 rounded-full bg-coral-bright" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">{progress}%</p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-rose">
            {error}
          </p>
        )}
      </div>
    </DialogContent>
  )
}
