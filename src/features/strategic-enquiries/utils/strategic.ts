import type { EnquiryRow } from '@/features/business-enquiries/types'
import { isOverdue, scalarEntries } from '@/features/business-enquiries/utils/format'
import { humanize } from '@/features/partner-applications/utils/format'

/**
 * Counts from returned rows only. The backend has three statuses (received, in_review, closed), so
 * "New" = received, "Under assessment" = in_review, "Completed" = closed. "Active discussions" and
 * "Awaiting decisions" have no backend source and are intentionally not computed.
 */
export function summarizeStrategic(rows: EnquiryRow[], now = Date.now()) {
  const n = (s: EnquiryRow['status']) => rows.filter((r) => r.status === s).length
  return {
    total: rows.length,
    received: n('received'),
    inReview: n('in_review'),
    closed: n('closed'),
    pendingFollowUps: rows.filter((r) => r.status !== 'closed' && r.next_follow_up_at).length,
    overdue: rows.filter((r) => isOverdue(r, now)).length,
    unassigned: rows.filter((r) => !r.assigned_user_id && r.status !== 'closed').length,
  }
}

/** Submission fields of StrategicEnquiryIn, shown first and in this order when the backend returns them. */
export const STRATEGIC_KEYS = [
  'discussion_type',
  'business_overview',
  'confidential_summary',
  'authorized_representative',
]

/** `details` is an untyped object in the spec: known strategic keys first, then any other scalar. */
export function strategicEntries(details: Record<string, unknown> | null | undefined) {
  const all = scalarEntries(details).map(([k, v]) => [k, String(v)] as const)
  const rank = (k: string) => {
    const i = STRATEGIC_KEYS.indexOf(k)
    return i < 0 ? STRATEGIC_KEYS.length : i
  }
  return [...all].sort((a, b) => rank(a[0]) - rank(b[0])).map(([k, v]) => [humanize(k), v] as const)
}
