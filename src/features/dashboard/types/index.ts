/** Shapes copied from the backend OpenAPI schemas (EnquiryRow, OrgRow, ReviewerApplicationOut). */
export interface ApiList<T> {
  success: boolean
  message: string
  data: T[] | null
  meta: Record<string, unknown> | null
}
export interface ApiDict {
  success: boolean
  message: string
  data: Record<string, unknown> | null
}
export interface EnquiryRow {
  id: string
  reference_number: string
  enquiry_type: string
  subject: string | null
  status: 'received' | 'in_review' | 'closed'
  priority: string
  source: string | null
  contact_name: string | null
  contact_email: string | null
  company_name: string | null
  assigned_user_id: string | null
  next_follow_up_at: string | null
  created_at: string
}
export interface OrgRow {
  id: string
  legal_name: string
  status: string
  country: string | null
  created_at: string
  open_application_status: string | null
}
export type PortalStatus =
  | 'draft'
  | 'submitted'
  | 'eligibility_verification'
  | 'capability_review'
  | 'commercial_legal_review'
  | 'pilot_onboarding'
  | 'scale_up'
  | 'information_requested'
  | 'rejected'
  | 'withdrawn'
export interface ReviewerApplication {
  id: string
  reference: string
  organization_id: string
  organization_name: string | null
  status: PortalStatus
  pathway: string | null
  assigned_reviewer_id: string | null
  submission_count: number
  submitted_at: string | null
}
export interface DateRange {
  from?: string // ISO date-time
  to?: string
}
