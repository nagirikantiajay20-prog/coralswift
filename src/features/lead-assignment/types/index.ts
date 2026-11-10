/** Normalized view of two separate backend resources; shapes come from EnquiryRow / ReviewerApplicationOut. */
export type AssignCategory = 'applications' | 'general' | 'project' | 'strategic'

export interface AssignRecord {
  key: string
  category: AssignCategory
  id: string
  reference: string
  title: string | null
  organization: string | null
  contactName: string | null
  contactEmail: string | null
  status: string
  /** null = the resource has no priority field. */
  priority: string | null
  assigneeId: string | null
  followUpAt: string | null
  /** Enquiry created_at / application submitted_at. The backend returns no "last updated". */
  createdAt: string | null
  pending: boolean
  /** null = the resource has no follow-up concept. */
  overdue: boolean | null
}

export interface Workload {
  assigneeId: string
  assigned: number
  pending: number
  overdue: number
  byCategory: Partial<Record<AssignCategory, number>>
}

/** undefined = the backend response did not provide the figure. */
export interface CategoryCounts {
  total?: number
  unassigned?: number
  mine?: number
  overdue?: number
}
