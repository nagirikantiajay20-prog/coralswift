import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { partnerApplicationsService as svc } from '@/features/partner-applications/services/partnerApplicationsService'
import { accessErrorMessage, canPreview, createUrlTracker } from '../utils/documents'
import type { DocRow } from '../types'

const PREVIEW_TTL_MS = 60_000

/** Authenticated preview/download through the shared API client; blob URLs are always revoked. */
export function useSecureDocument(doc: DocRow | undefined) {
  const tracker = useRef(createUrlTracker())
  const [busy, setBusy] = useState<'preview' | 'download' | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const t = tracker.current
    return () => t.revokeAll()
  }, [])

  const run = async (mode: 'preview' | 'download') => {
    if (!doc) return
    setBusy(mode)
    setError(null)
    try {
      const raw = await svc.downloadDocument(doc.applicationId, doc.id, doc.versionNo ?? undefined)
      const previewable = mode === 'preview' && canPreview(doc.contentType)
      // Re-type the blob only for the allow-listed preview types.
      const blob = previewable ? new Blob([raw], { type: doc.contentType! }) : raw
      const url = tracker.current.create(blob)
      if (previewable) {
        window.open(url, '_blank', 'noopener')
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = doc.filename ?? 'document'
        a.rel = 'noopener'
        a.click()
      }
      setTimeout(() => tracker.current.revoke(url), previewable ? PREVIEW_TTL_MS : 1000)
    } catch (e) {
      const m = accessErrorMessage(e)
      setError(m)
      toast.error(m)
    } finally {
      setBusy(null)
    }
  }
  return { busy, error, preview: () => run('preview'), download: () => run('download') }
}
