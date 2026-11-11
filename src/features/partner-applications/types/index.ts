/** Shapes copied from the backend OpenAPI schemas (ReviewerApplicationOut, ReviewDetailOut, ...). */
import type { ApiList } from '@/features/dashboard/types'
export type { ApiList }

export interface ApiOne<T> {
  success: boolean
  message: string
  data: T | null
  meta: Record<string, unknown> | null
}

export const PORTAL_STATUSES = [
  'draft',
  'submitted',
  'eligibility_verification',
  'capability_review',
  'commercial_legal_review',
  'pilot_onboarding',
  'scale_up',
  'information_requested',
  'rejected',
  'withdrawn',
] as const
export type PortalStatus = (typeof PORTAL_STATUSES)[number]

export const DOC_CATEGORIES = [
  'registration_proof',
  'operating_history',
  'employee_strength',
  'financial_statements',
  'service_portfolio',
  'infrastructure_summary',
  'client_references',
  'authorized_contact',
] as const
export type DocCategory = (typeof DOC_CATEGORIES)[number]

export const REVIEW_STATUSES = ['pending', 'accepted', 'rejected', 'clarification_needed'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export interface ReviewerApplication {
  id: string
  reference: string
  organization_id: string
  organization_name: string
  status: PortalStatus
  pathway: string
  assigned_reviewer_id: string | null
  submission_count: number
  submitted_at: string | null
  /** Server-computed legal next stages (live 2026-11-10); absent on older responses. */
  allowed_next?: PortalStatus[]
}

export interface Organization {
  id: string
  legal_name: string
  status: string
  registration_number: string | null
  year_established: number | null
  employee_count: number | null
  annual_turnover_inr_crore: string | null
  registered_address: string | null
  country: string | null
  website: string | null
  service_categories: string[] | null
  technical_capabilities: string | null
  infrastructure_summary: string | null
  business_description: string | null
  client_references: Record<string, unknown>[] | null
  authorized_contacts: Record<string, unknown>[] | null
  profile_version: number
}

export interface DocVersion {
  version_no: number
  original_filename: string
  content_type: string
  file_size: number
  upload_status: string
  expires_on: string | null
  review_status: string
  review_comment: string | null
  uploaded_at: string
}
export interface ApplicationDocument {
  id: string
  category: DocCategory
  status: string
  current_version: DocVersion | null
}

export interface EligibilityRecord {
  id: string
  submission_no: number
  verified_by: string
  verified_at: string
  verified_operating_years: string | null
  verified_personnel: number | null
  verified_turnover_inr_crore: string | null
  outcome: string
  exception_note: string | null
  notes: string | null
}

export interface HistoryItem {
  from_status: PortalStatus | null
  to_status: PortalStatus
  actor_type: string
  actor_user_id: string
  reason: string | null
  partner_note: string | null
  created_at: string
}

export interface ReviewDetail {
  application: ReviewerApplication
  organization: Organization
  documents: ApplicationDocument[]
  eligibility_verifications: EligibilityRecord[]
  status_history: HistoryItem[]
  open_information_requests: number
}

export interface Note {
  id: string
  author_id: string
  body: string
  created_at: string
}
export interface Message {
  id: string
  kind: string
  status: string | null
  author_user_id: string
  body: string
  requested_categories: string[] | null
  in_reply_to: string | null
  created_at: string
}
export interface AuditItem {
  action: string
  actor_type: string
  actor_user_id: string | null
  request_id: string | null
  meta: Record<string, unknown>
  created_at: string
}
export interface Reviewer {
  id: string
  email?: string
  full_name: string
  staff_role: string
  status: string
}

export const VERIFICATION_OUTCOMES = [
  'verified',
  'verified_with_exception',
  'not_verified',
  'inconclusive',
] as const
export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number]

export interface EligibilityBody {
  outcome: VerificationOutcome
  verified_operating_years?: number
  verified_personnel?: number
  verified_turnover_inr_crore?: number
  exception_note?: string
  notes?: string
}

export interface ListParams {
  status?: PortalStatus
  unassigned?: boolean
  page: number
  page_size: number
}

/** GET /reviewer/transitions: every status change a reviewer may make, with its requirements. */
export interface TransitionRule {
  from: string
  to: string
  needs_reason: boolean
  needs_assigned_reviewer: boolean
  dedicated_endpoint: boolean
}
