import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { partnerDashboardService as dash } from '../services/partnerDashboardService'
import { partnerDocumentService as svc } from '../services/partnerDocumentService'
import { latestApplication } from './usePartnerDashboard'
import { accessErrorMessage, canPreview, createUrlTracker } from '../utils/documentFiles'

/**
 * Query keys are shared with the dashboard (same endpoints, same shapes), so cached data is reused
 * and never crosses partner sessions (partner id is part of every key).
 */
export function usePartnerDocuments() {
  const pid = useAuthStore((s) => s.partner?.id)
  const qc = useQueryClient()
  const o = { staleTime: 60_000, retry: 1, enabled: !!pid }
  const documents = useQuery({ queryKey: ['partner', pid, 'documents'], queryFn: svc.list, ...o })
  const applications = useQuery({
    queryKey: ['partner', pid, 'applications'],
    queryFn: dash.applications,
    ...o,
  })
  const docRequests = useQuery({
    queryKey: ['partner', pid, 'document-requests'],
    queryFn: () => svc.documentRequests('open'),
    ...o,
  })
  const app = latestApplication(applications.data)
  const messages = useQuery({
    queryKey: ['partner', pid, 'messages', app?.id],
    queryFn: () => svc.messages(app!.id),
    ...o,
    enabled: !!pid && !!app,
  })
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['partner', pid, 'documents'] })
    void qc.invalidateQueries({ queryKey: ['partner', pid, 'messages'] })
    void qc.invalidateQueries({ queryKey: ['partner', pid, 'document-requests'] })
    void qc.invalidateQueries({ queryKey: ['partner', pid, 'applications'] })
  }
  const remove = useMutation({
    mutationFn: svc.remove,
    onSuccess: () => {
      toast.success('Document removed')
      refresh()
    },
    onError: () => toast.error('The document could not be removed. Try again.'),
  })
  const respond = useMutation({
    mutationFn: (v: { inReplyTo: string; body: string }) =>
      svc.respond(app!.id, v.inReplyTo, v.body),
    onSuccess: () => {
      toast.success('Response sent')
      refresh()
    },
    onError: () => toast.error('Your response could not be sent. Try again.'),
  })
  return { documents, docRequests, applications, app, messages, remove, respond, refresh }
}

export function useDocumentHistory(id: string | undefined) {
  const pid = useAuthStore((s) => s.partner?.id)
  return useQuery({
    queryKey: ['partner', pid, 'document-history', id],
    queryFn: () => svc.history(id!),
    enabled: !!pid && !!id,
  })
}

const PREVIEW_TTL_MS = 60_000
interface VersionRef {
  version_no: number
  content_type: string
  original_filename: string
}
/** Authenticated preview/download; blob URLs are tracked and always revoked. */
export function useSecureDownload() {
  const tracker = useRef(createUrlTracker())
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const t = tracker.current
    return () => t.revokeAll()
  }, [])
  const run = async (mode: 'preview' | 'download', id: string, v: VersionRef) => {
    setBusy(true)
    try {
      const raw = await svc.download(id, v.version_no)
      const previewable = mode === 'preview' && canPreview(v.content_type)
      const url = tracker.current.create(
        previewable ? new Blob([raw], { type: v.content_type }) : raw,
      )
      if (previewable) window.open(url, '_blank', 'noopener')
      else {
        const a = document.createElement('a')
        a.href = url
        a.download = v.original_filename
        a.rel = 'noopener'
        a.click()
      }
      setTimeout(() => tracker.current.revoke(url), previewable ? PREVIEW_TTL_MS : 1000)
    } catch (e) {
      toast.error(accessErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return {
    busy,
    preview: (id: string, v: VersionRef) => run('preview', id, v),
    download: (id: string, v: VersionRef) => run('download', id, v),
  }
}
