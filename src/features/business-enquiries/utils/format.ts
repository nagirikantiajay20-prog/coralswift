import type { StatusTone } from '@/components/common/StatusBadge'
import type { EnquiryRow, EnquiryStatus, Priority } from '../types'

export const STATUS_TONE: Record<EnquiryStatus, StatusTone> = {
  received: 'info',
  in_review: 'warning',
  closed: 'neutral',
}
export const PRIORITY_TONE: Record<Priority, StatusTone> = {
  low: 'neutral',
  normal: 'info',
  high: 'danger',
}

/** PRD "IT services" list (ERP, web apps, custom software, cloud, testing); the rest of ProjectCategory is Non-IT operations. */
const IT_CATEGORIES = [
  'erp_implementation',
  'web_app_development',
  'custom_software',
  'cloud_infrastructure',
  'testing_maintenance',
]
/** The backend has no IT/Non-IT field: derived from `details.project_category` when present. */
export function projectGroup(details: Record<string, unknown> | null | undefined) {
  const c = details?.project_category
  if (typeof c !== 'string') return undefined
  return IT_CATEGORIES.includes(c) ? 'IT' : 'Non-IT'
}

export const isOverdue = (e: EnquiryRow, now = Date.now()) =>
  e.status !== 'closed' && !!e.next_follow_up_at && Date.parse(e.next_follow_up_at) < now

/** Counts for the overview, computed only from returned rows. */
export function summarize(rows: EnquiryRow[], now = Date.now()) {
  const by = (s: EnquiryStatus) => rows.filter((r) => r.status === s).length
  return {
    total: rows.length,
    received: by('received'),
    inReview: by('in_review'),
    closed: by('closed'),
    unassigned: rows.filter((r) => !r.assigned_user_id && r.status !== 'closed').length,
    overdue: rows.filter((r) => isOverdue(r, now)).length,
  }
}

/** Scalar entries of a free-form backend object, for generic rendering. */
export const scalarEntries = (o: Record<string, unknown> | null | undefined) =>
  Object.entries(o ?? {}).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
