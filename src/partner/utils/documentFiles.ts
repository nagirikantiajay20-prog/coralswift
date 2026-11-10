import { isAxiosError } from 'axios'
import { toAppError } from '@/services/api/errors'
import type { DocCategory } from '@/features/partner-applications/types'
import type {
  DocVersion,
  PartnerDocument,
  PartnerMessage,
} from '../services/partnerDocumentService'

export { REVIEW_LABEL, STATUS_TONE } from '@/features/document-management/utils/documents'
export {
  accessErrorMessage,
  canPreview,
  createUrlTracker,
  formatSize,
} from '@/features/document-management/utils/documents'

/** Backend upload contract: "pdf, png, jpg, docx or xlsx". No size limit is documented. */
export const ALLOWED_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
}
export const ACCEPT = Object.keys(ALLOWED_TYPES)
  .map((e) => `.${e}`)
  .join(',')
export const FORMATS_TEXT = 'PDF, PNG, JPG, DOCX or XLSX'

/** UX pre-check only. The backend validates type, size and content and is authoritative. */
export function validateFile(f: File): string | null {
  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
  const mimes = ALLOWED_TYPES[ext]
  if (!mimes) return `Unsupported file type. Use ${FORMATS_TEXT}.`
  if (f.type && !mimes.includes(f.type))
    return `This file's type does not match its .${ext} extension.`
  if (f.size === 0) return 'This file is empty.'
  return null
}

export const CATEGORY_LABEL: Record<DocCategory, string> = {
  registration_proof: 'Company registration proof',
  operating_history: 'Operating history evidence',
  employee_strength: 'Workforce evidence',
  financial_statements: 'Financial statements',
  service_portfolio: 'Service portfolio',
  infrastructure_summary: 'Infrastructure summary',
  client_references: 'Client references',
  authorized_contact: 'Authorized contact details',
}
export const categoryLabel = (c: string) =>
  CATEGORY_LABEL[c as DocCategory] ?? c.replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase())

/** Display grouping only; backend category identifiers are unchanged. */
export const CATEGORY_GROUPS: { title: string; categories: DocCategory[] }[] = [
  {
    title: 'Company standing',
    categories: ['registration_proof', 'operating_history', 'financial_statements'],
  },
  {
    title: 'Capability',
    categories: ['service_portfolio', 'infrastructure_summary', 'employee_strength'],
  },
  { title: 'References and contacts', categories: ['client_references', 'authorized_contact'] },
]
/** Rejected / replacement-requested documents need the partner to act. */
export const needsAction = (v: DocVersion | null | undefined) =>
  v?.review_status === 'rejected' || v?.review_status === 'clarification_needed'

/** Accepted documents are treated as locked in the UI; the backend still decides. */
export const canModify = (d: PartnerDocument) =>
  !!d.current_version && d.current_version.review_status !== 'accepted'

export interface DocRequest {
  message: PartnerMessage
  categories: string[]
  answered: boolean
}
/**
 * Additional document requests = reviewer messages that name requested categories (the only
 * mechanism the backend has). A request is answered once the partner has a reply with in_reply_to.
 * The contract has no deadline field, so none is shown.
 */
export function documentRequests(messages: PartnerMessage[] | undefined): DocRequest[] {
  const all = messages ?? []
  const replied = new Set(
    all.filter((m) => !m.from_reviewer && m.in_reply_to).map((m) => m.in_reply_to),
  )
  return all
    .filter((m) => m.from_reviewer && m.requested_categories?.length)
    .map((m) => ({ message: m, categories: m.requested_categories!, answered: replied.has(m.id) }))
    .sort((a, b) => b.message.created_at.localeCompare(a.message.created_at))
}

/** Backend rejects uploads with 413/415/409/429/422; map by status, never leak internals. */
export function uploadErrorMessage(e: unknown): string {
  if (isAxiosError(e)) {
    switch (e.response?.status) {
      case 413:
        return 'The file is too large for the server. Choose a smaller file.'
      case 415:
        return `The server does not accept this file type. Use ${FORMATS_TEXT}.`
      case 409:
        return 'A document for this category already exists, or it cannot be changed right now. Refresh the page.'
      case 429:
        return 'Too many uploads. Wait a moment and try again.'
    }
  }
  return toAppError(e).message
}
export const isCancel = (e: unknown) => isAxiosError(e) && e.code === 'ERR_CANCELED'
