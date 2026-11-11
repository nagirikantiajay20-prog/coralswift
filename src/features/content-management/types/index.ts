// Verified against openapi.json (2026-11-10): AdminContent, ContentIn, ContentUpdate, VersionOut, ClaimOut.
export const CONTENT_TYPES = ['article', 'faq', 'page', 'resource'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]
export const CONTENT_STATUSES = ['draft', 'in_review', 'approved', 'published', 'archived'] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]
export const CLAIM_CATEGORIES = [
  'company',
  'geography',
  'partner_reference',
  'project',
  'certification',
  'testimonial',
  'other',
] as const
export type ClaimCategory = (typeof CLAIM_CATEGORIES)[number]
export const CLAIM_STATUSES = [
  'verified',
  'pending_verification',
  'illustrative',
  'prohibited',
] as const
export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

export interface Attachment {
  filename: string
  content_type: string | null
  size: number | null
  version_label: string | null
}
export interface AdminContent {
  id: string
  slug: string
  content_type: ContentType
  title: string
  summary: string | null
  body: string
  category: string | null
  tags: string[]
  status: ContentStatus
  published_at: string | null
  last_reviewed_at: string | null
  attachment: Attachment | null
  owner_id: string
  reviewer_id: string | null
  review_note: string | null
  current_version: number
  claim_ids: string[]
  /** Set while a future publication is scheduled (POST/DELETE .../schedule). */
  scheduled_publish_at?: string | null
}
export interface ContentVersion {
  version_no: number
  title: string
  summary: string | null
  body: string
  edited_by: string
  created_at: string
}
export interface Claim {
  id: string
  claim_text: string
  category: ClaimCategory
  owner_id: string
  evidence_status: ClaimStatus
  evidence_ref: string | null
  publication_permission: boolean
  last_reviewed_at: string | null
}
export interface ApiList<T> {
  data: T[] | null
  meta: Record<string, unknown> | null
}
export interface ContentListParams {
  status?: ContentStatus
  type?: ContentType
  q?: string
  page: number
  page_size: number
}
export interface ContentInput {
  slug: string
  content_type: ContentType
  title: string
  summary: string | null
  body: string
  category: string | null
  tags: string[]
  claim_ids: string[]
}
/** PATCH: slug and content_type cannot be changed after creation (not in ContentUpdate). */
export type ContentPatch = Omit<ContentInput, 'slug' | 'content_type'>
