import type { ModuleKey } from '@/config/permissions'
import type { EnquiryRow, EnquiryType } from '@/features/business-enquiries/types'
import { isOverdue } from '@/features/business-enquiries/utils/format'
import type { ReviewerApplication } from '@/features/partner-applications/types'
import type { AssignCategory, AssignRecord, Workload } from '../types'

/**
 * Categories are separate backend resources and are never merged:
 * applications -> /reviewer/applications, the rest -> /admin/enquiries?type=...
 * `module` is a UX gate only; the backend authorizes every call.
 */
export const CATEGORIES: {
  key: AssignCategory
  label: string
  module: ModuleKey
  enquiryType?: EnquiryType
}[] = [
  { key: 'applications', label: 'Partner Applications', module: 'applicationReviews' },
  { key: 'general', label: 'Business Enquiries', module: 'enquiries', enquiryType: 'general' },
  { key: 'project', label: 'Project Enquiries', module: 'enquiries', enquiryType: 'project' },
  {
    key: 'strategic',
    label: 'Strategic / M&A Enquiries',
    module: 'strategicEnquiries',
    enquiryType: 'strategic',
  },
]

export const visibleCategories = (can: (m: ModuleKey) => boolean) =>
  CATEGORIES.filter((c) => can(c.module))

export const fromEnquiry = (r: EnquiryRow, category: AssignCategory): AssignRecord => ({
  key: `${category}:${r.id}`,
  category,
  id: r.id,
  reference: r.reference_number,
  title: r.subject,
  organization: r.company_name,
  contactName: r.contact_name,
  contactEmail: r.contact_email,
  status: r.status,
  priority: r.priority,
  assigneeId: r.assigned_user_id,
  followUpAt: r.next_follow_up_at,
  createdAt: r.created_at,
  pending: r.status !== 'closed',
  overdue: isOverdue(r),
})

export const fromApplication = (r: ReviewerApplication): AssignRecord => ({
  key: `applications:${r.id}`,
  category: 'applications',
  id: r.id,
  reference: r.reference,
  title: r.pathway,
  organization: r.organization_name,
  contactName: null, // not on ReviewerApplicationOut
  contactEmail: null,
  status: r.status,
  priority: null, // applications have no priority
  assigneeId: r.assigned_reviewer_id,
  followUpAt: null, // applications have no follow-up date
  createdAt: r.submitted_at,
  pending: r.status !== 'rejected' && r.status !== 'withdrawn',
  overdue: null,
})

export const assigneeLabel = (
  id: string | null,
  me: string | undefined,
  names?: Map<string, string>,
) => (!id ? 'Unassigned' : id === me ? 'Me' : (names?.get(id) ?? id.slice(0, 8)))

export type AssignCheck = 'empty' | 'same' | 'confirm' | 'ok'
/** Applications cannot be unassigned (reviewer_id is required); enquiries can (user_id null). */
export function checkAssignment(
  current: string | null,
  next: string | null,
  canClear: boolean,
): AssignCheck {
  if (!next && !canClear) return 'empty'
  if ((next || null) === (current || null)) return 'same'
  return current ? 'confirm' : 'ok'
}

/** Tallies the supplied rows only; callers must disclose that these are a sample of the backend total. */
export function tallyWorkload(records: AssignRecord[]): Workload[] {
  const m = new Map<string, Workload>()
  for (const r of records) {
    if (!r.assigneeId) continue
    const w = m.get(r.assigneeId) ?? {
      assigneeId: r.assigneeId,
      assigned: 0,
      pending: 0,
      overdue: 0,
      byCategory: {},
    }
    w.assigned++
    if (r.pending) w.pending++
    if (r.overdue) w.overdue++
    w.byCategory[r.category] = (w.byCategory[r.category] ?? 0) + 1
    m.set(r.assigneeId, w)
  }
  return [...m.values()].sort((a, b) => b.pending - a.pending || b.assigned - a.assigned)
}
