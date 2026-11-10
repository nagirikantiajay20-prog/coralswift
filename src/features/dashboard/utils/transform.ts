import type { EnquiryRow, PortalStatus, ReviewerApplication } from '../types'

export const STATUS_LABEL: Record<PortalStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  eligibility_verification: 'Eligibility verification',
  capability_review: 'Capability review',
  commercial_legal_review: 'Commercial & legal review',
  pilot_onboarding: 'Pilot onboarding',
  scale_up: 'Scale-up',
  information_requested: 'Information requested',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}
/** Pipeline stages of the backend's PortalStatus enum, in backend order. */
export const PIPELINE: PortalStatus[] = [
  'submitted',
  'eligibility_verification',
  'capability_review',
  'commercial_legal_review',
  'pilot_onboarding',
  'scale_up',
]

export function countBy<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>()
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1))
  return m
}
export const countStatus = (apps: ReviewerApplication[], s: PortalStatus) =>
  apps.filter((a) => a.status === s).length

export const statusDistribution = (apps: ReviewerApplication[]) =>
  [...countBy(apps, (a) => a.status)].map(([k, value]) => ({
    name: STATUS_LABEL[k as PortalStatus] ?? k,
    value,
  }))

export const onboardingProgress = (apps: ReviewerApplication[]) =>
  PIPELINE.map((s) => ({ name: STATUS_LABEL[s], value: countStatus(apps, s) }))

/** Groups rows by calendar day (YYYY-MM-DD, ascending). */
export function dailyCounts<T>(rows: T[], when: (r: T) => string | null) {
  const m = countBy(
    rows.filter((r) => when(r)),
    (r) => when(r)!.slice(0, 10),
  )
  return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value }))
}

export const isOpenEnquiry = (e: EnquiryRow) => e.status !== 'closed'
export const upcomingFollowUps = (es: EnquiryRow[]) =>
  es
    .filter((e) => isOpenEnquiry(e) && e.next_follow_up_at)
    .sort((a, b) => a.next_follow_up_at!.localeCompare(b.next_follow_up_at!))

export const newest = <T>(rows: T[], when: (r: T) => string | null, n = 5) =>
  [...rows].sort((a, b) => (when(b) ?? '').localeCompare(when(a) ?? '')).slice(0, n)

/** Numeric top-level entries of an untyped dict, labelled by their own backend key. */
export const numericEntries = (d: Record<string, unknown> | undefined) =>
  Object.entries(d ?? {})
    .filter(([, v]) => typeof v === 'number')
    .map(([key, v]) => ({ key, label: key.replace(/_/g, ' '), value: v as number }))

export const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

/** yyyy-mm-dd (from <input type=date>) -> inclusive ISO bounds. */
export const dayStart = (d: string) => (d ? `${d}T00:00:00Z` : undefined)
export const dayEnd = (d: string) => (d ? `${d}T23:59:59Z` : undefined)
