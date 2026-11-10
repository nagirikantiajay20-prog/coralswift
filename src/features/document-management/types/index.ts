/**
 * Document types are reused from partner-applications (OpenAPI: partner_documents DocumentOut /
 * VersionOut, ReviewStatus, PartnerDocCategory). The backend has NO admin-wide document listing,
 * so a document is always addressed through its application: (applicationId, documentId).
 */
import type { DocCategory, ReviewStatus } from '@/features/partner-applications/types'

export type {
  ApplicationDocument,
  DocCategory,
  DocVersion,
  ReviewStatus,
  ReviewerApplication,
} from '@/features/partner-applications/types'

/** One row of the per-application document list (derived only from backend fields). */
export interface DocRow {
  id: string
  applicationId: string
  category: DocCategory
  filename: string | null
  contentType: string | null
  size: number | null
  versionNo: number | null
  uploadedAt: string | null
  reviewStatus: ReviewStatus | null
  reviewComment: string | null
  uploadStatus: string | null
  expiresOn: string | null
}

export type ReviewAction = 'accept' | 'reject' | 'request_replacement'
