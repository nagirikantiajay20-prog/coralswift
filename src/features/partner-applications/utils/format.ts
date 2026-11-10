import type { StatusTone } from '@/components/common/StatusBadge'
import type { PortalStatus } from '../types'

/** "capability_review" -> "Capability review" */
export const humanize = (s: string) => {
  const t = s.replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'
export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export const STATUS_TONE: Record<PortalStatus, StatusTone> = {
  draft: 'neutral',
  submitted: 'info',
  eligibility_verification: 'info',
  capability_review: 'info',
  commercial_legal_review: 'info',
  pilot_onboarding: 'success',
  scale_up: 'success',
  information_requested: 'warning',
  rejected: 'danger',
  withdrawn: 'neutral',
}

/**
 * Statuses a reviewer may pick in the transition form. The backend only says "another permitted
 * stage" (no transition table in the spec), so it validates; we merely omit statuses that have
 * their own flow (information_requested -> information-requests endpoint) or belong to the partner
 * (draft, submitted, withdrawn).
 */
export const REVIEWER_TARGETS: PortalStatus[] = [
  'eligibility_verification',
  'capability_review',
  'commercial_legal_review',
  'pilot_onboarding',
  'scale_up',
  'rejected',
]

export const shortId = (id: string | null) => (id ? id.slice(0, 8) : '—')

/** Pagination meta is untyped in the spec: use total/pages if present, else infer from a full page. */
export function pageCount(
  meta: Record<string, unknown> | null,
  page: number,
  size: number,
  got: number,
) {
  const n = (k: string) => (typeof meta?.[k] === 'number' ? (meta[k] as number) : undefined)
  const pages = n('pages') ?? n('total_pages') ?? n('page_count')
  if (pages) return pages
  const total = n('total') ?? n('total_count')
  if (total !== undefined) return Math.max(1, Math.ceil(total / size))
  return got >= size ? page + 1 : page
}
