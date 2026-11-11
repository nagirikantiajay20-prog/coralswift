/** Shapes copied from the backend OpenAPI schemas (EnquiryRow, EnquiryDetail, FollowUpOut, EnquiryUpdate). */
import type { EnquiryRow } from '@/features/dashboard/types'
import type { ApiList } from '@/features/dashboard/types'
export type { ApiList, EnquiryRow }

export const ENQUIRY_STATUSES = ['received', 'in_review', 'closed'] as const
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number]
export const ENQUIRY_TYPES = ['general', 'project', 'partner', 'strategic', 'meeting'] as const
export type EnquiryType = (typeof ENQUIRY_TYPES)[number]
export const PRIORITIES = ['low', 'normal', 'high'] as const
export type Priority = (typeof PRIORITIES)[number]

export interface FollowUp {
  id: string
  author_id: string
  note: string
  due_at: string | null
  completed_at: string | null
  created_at: string
}

/** `contact`, `company`, `details` and `documents` are untyped objects in the spec: rendered generically. */
export interface EnquiryDetail {
  enquiry: EnquiryRow
  message: string | null
  contact: Record<string, unknown>
  company: Record<string, unknown> | null
  details: Record<string, unknown> | null
  documents: Record<string, unknown>[]
  follow_ups: FollowUp[]
}

export interface ApiOne<T> {
  success: boolean
  message: string
  data: T | null
  meta: Record<string, unknown> | null
}

export interface StaffUser {
  id: string
  email?: string
  full_name: string
  staff_role: string
  status: string
}

/** Backend DiscussionType (strategic enquiries only). */
export const DISCUSSION_TYPES = ['merger', 'integration', 'strategic_partnership'] as const
export type DiscussionType = (typeof DISCUSSION_TYPES)[number]

export interface EnquiryListParams {
  page: number
  page_size: number
  type?: EnquiryType
  status?: EnquiryStatus
  priority?: Priority
  assigned_user_id?: string
  unassigned?: boolean
  overdue?: boolean
  sla_breached?: boolean
  discussion_type?: DiscussionType
  q?: string
  created_from?: string
  created_to?: string
}
