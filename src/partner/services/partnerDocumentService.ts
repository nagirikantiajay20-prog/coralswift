import { partnerEndpoints as E } from '../config/endpoints'
import { api } from '@/services/api/client'

/**
 * Mirrors openapi.json (2026-11-10): partner_documents DocumentOut / VersionOut, Body_upload_*,
 * Body_replace_*, PartnerMessageOut, RespondIn. No organization id is ever sent (token-derived).
 */
export interface DocVersion {
  version_no: number
  original_filename: string
  content_type: string
  file_size: number
  checksum_sha256: string
  upload_status: string
  expires_on: string | null
  review_status: string
  review_comment: string | null // partner-visible reviewer comment (DocumentReviewIn.comment)
  uploaded_at: string
}
export interface PartnerDocument {
  id: string
  category: string
  status: string
  current_version: DocVersion | null
  /** Backend-decided permissions; the UI shows an action only when its flag is exactly true. */
  can_replace: boolean
  can_remove: boolean
  can_download: boolean
}
export interface PartnerMessage {
  id: string
  kind: string
  status: string | null
  from_reviewer: boolean
  body: string
  requested_categories: string[] | null
  in_reply_to: string | null
  created_at: string
}
/** Backend PartnerDocumentRequestOut (GET /partner/document-requests). */
export interface PartnerDocumentRequest {
  id: string
  application_reference: string | null
  category: string
  note: string
  due_at: string | null
  status: 'open' | 'fulfilled' | 'cancelled'
  is_overdue: boolean
  fulfilled_document_id: string | null
  fulfilled_at: string | null
  created_at: string
}
export interface UploadOpts {
  requestId?: string
  expiresOn?: string
  signal?: AbortSignal
  onProgress?: (percent: number) => void
}

const data = <T>(r: { data: { data: T | null } }) => r.data.data

function form(file: File, expiresOn?: string, category?: string, requestId?: string) {
  const f = new FormData()
  f.append('file', file)
  if (category) f.append('category', category)
  if (expiresOn) f.append('expires_on', expiresOn)
  if (requestId) f.append('request_id', requestId)
  return f
}
const cfg = (o: UploadOpts) => ({
  signal: o.signal,
  onUploadProgress: (e: { loaded: number; total?: number }) =>
    o.onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
})

export const partnerDocumentService = {
  list: async () => data(await api.get<{ data: PartnerDocument[] | null }>(E.documents)) ?? [],
  documentRequests: async (status: PartnerDocumentRequest['status'] = 'open') =>
    data(
      await api.get<{ data: PartnerDocumentRequest[] | null }>(E.documentRequests, {
        params: { status, page_size: 100 },
      }),
    ) ?? [],
  upload: async (file: File, category: string, o: UploadOpts = {}) =>
    data(
      await api.post<{ data: PartnerDocument | null }>(
        E.documents,
        form(file, o.expiresOn, category, o.requestId),
        cfg(o),
      ),
    ),
  replace: async (id: string, file: File, o: UploadOpts = {}) =>
    data(
      await api.post<{ data: PartnerDocument | null }>(
        E.documentVersions(id),
        form(file, o.expiresOn),
        cfg(o),
      ),
    ),
  remove: (id: string) => api.delete(E.document(id)),
  history: async (id: string) =>
    data(await api.get<{ data: DocVersion[] | null }>(E.documentHistory(id))) ?? [],
  /** Authorised, audited download through the shared client; never a public URL. */
  download: async (id: string, version?: number) =>
    (
      await api.get<Blob>(E.documentDownload(id), {
        params: version ? { version } : undefined,
        responseType: 'blob',
      })
    ).data,
  messages: async (appId: string) =>
    data(await api.get<{ data: PartnerMessage[] | null }>(E.messages(appId))) ?? [],
  respond: (appId: string, inReplyTo: string, body: string) =>
    api.post(E.messages(appId), { in_reply_to: inReplyTo, body }),
}
