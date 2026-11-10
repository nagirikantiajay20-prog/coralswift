import type { StatusTone } from '@/components/common/StatusBadge'
import type {
  HistoryItem,
  PartnerApplication,
  PartnerMessage,
} from '../services/partnerDashboardService'

/**
 * Backend `PortalStatus` (openapi.json 2026-11-10) -> partner-facing wording. Only real backend
 * values; there is NO generic "approved" status. Unknown values fall back to the backend label.
 */
interface StatusInfo {
  tone: StatusTone
  meaning: string
  next: string
}
export const STATUS_INFO: Record<string, StatusInfo> = {
  draft: {
    tone: 'neutral',
    meaning: 'Your application has not been submitted yet.',
    next: 'Complete your profile and documents, then submit.',
  },
  submitted: {
    tone: 'info',
    meaning: 'Your application has been received and is waiting for review.',
    next: 'No action needed unless we contact you.',
  },
  eligibility_verification: {
    tone: 'info',
    meaning: 'Our team is verifying your eligibility. This is not an approval.',
    next: 'Keep your profile and documents up to date.',
  },
  capability_review: {
    tone: 'info',
    meaning: 'Our team is reviewing your capabilities.',
    next: 'Respond to any information requests.',
  },
  commercial_legal_review: {
    tone: 'info',
    meaning: 'Our team is carrying out commercial and legal review.',
    next: 'Respond to any information requests.',
  },
  information_requested: {
    tone: 'warning',
    meaning: 'The review team needs more information from you.',
    next: 'Respond to the open request(s) below.',
  },
  pilot_onboarding: {
    tone: 'success',
    meaning: 'A decision to proceed to pilot onboarding has been communicated.',
    next: 'Our team manages onboarding with you. This status does not change your account access.',
  },
  scale_up: {
    tone: 'success',
    meaning: 'A decision to proceed to scale-up has been communicated.',
    next: 'Our team will contact you about next steps.',
  },
  rejected: {
    tone: 'danger',
    meaning: 'A decision not to proceed with this application has been communicated.',
    next: 'See any explanation provided below.',
  },
  withdrawn: {
    tone: 'neutral',
    meaning: 'This application was withdrawn.',
    next: 'No further action on this application.',
  },
}
export const statusInfo = (s: string): StatusInfo =>
  STATUS_INFO[s] ?? { tone: 'neutral', meaning: '', next: '' }

/** PRD reference stages that the backend actually models as statuses (in order). */
export const PIPELINE = [
  ['submitted', 'Submitted'],
  ['eligibility_verification', 'Eligibility verification'],
  ['capability_review', 'Capability review'],
  ['commercial_legal_review', 'Commercial and legal review'],
  ['pilot_onboarding', 'Pilot onboarding'],
  ['scale_up', 'Scale-up'],
] as const
const ORDER: string[] = PIPELINE.map(([k]) => k)
export const DECISIONS = ['rejected', 'pilot_onboarding', 'scale_up']
export const TERMINAL = ['rejected', 'withdrawn']
const REVIEW_STAGES = ['eligibility_verification', 'capability_review', 'commercial_legal_review']

export type StageState = 'complete' | 'current' | 'upcoming' | 'unconfirmed'
export interface Stage {
  key: string
  label: string
  state: StageState
  paused?: boolean
}

/**
 * A stage is "complete" only when backend history (or submitted_at) confirms it. Position comes
 * from the current status, or for information_requested from the latest pipeline status in
 * history. No percentages. Drafts have no tracker; rejected/withdrawn show reached stages only.
 */
export function buildTracker(app: PartnerApplication, history: HistoryItem[]): Stage[] {
  if (app.status === 'draft') return []
  const seen = new Set<string>(history.map((h) => h.to_status))
  if (app.submitted_at) seen.add('submitted')
  const latest = [...history]
    .filter((h) => ORDER.includes(h.to_status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.to_status
  const paused = app.status === 'information_requested'
  const terminal = TERMINAL.includes(app.status)
  const current = ORDER.includes(app.status) ? app.status : paused ? latest : undefined
  const ci = current ? ORDER.indexOf(current) : -1
  const lastIdx = Math.max(-1, ...[...seen].map((s) => ORDER.indexOf(s)))
  return PIPELINE.flatMap(([key, label], i): Stage[] => {
    if (terminal) return seen.has(key) && i <= lastIdx ? [{ key, label, state: 'complete' }] : []
    if (key === current) return [{ key, label, state: 'current', paused }]
    if (seen.has(key)) return [{ key, label, state: 'complete' }]
    return [{ key, label, state: i < ci ? 'unconfirmed' : 'upcoming' }]
  })
}

export interface Decision {
  status: string
  date: string | null
  reason: string | null
}
/** Only for backend decision values; date/reason come from partner-visible history. */
export function decisionOf(app: PartnerApplication, history: HistoryItem[]): Decision | null {
  if (!DECISIONS.includes(app.status)) return null
  const h = [...history]
    .filter((x) => x.to_status === app.status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  return { status: app.status, date: h?.created_at ?? null, reason: h?.note ?? null }
}

export interface InfoRequest {
  message: PartnerMessage
  categories: string[]
  answered: boolean
}
/**
 * Information requests = reviewer messages whose `kind` contains "request" or that name
 * requested_categories (`kind` values are not enumerated in the contract). Answered = the partner
 * has a reply whose in_reply_to is the request id. The contract has no due date.
 */
export function infoRequests(messages: PartnerMessage[] | undefined): InfoRequest[] {
  const all = messages ?? []
  const replied = new Set(
    all.filter((m) => !m.from_reviewer && m.in_reply_to).map((m) => m.in_reply_to),
  )
  return all
    .filter((m) => m.from_reviewer && (/request/i.test(m.kind) || m.requested_categories?.length))
    .map((m) => ({
      message: m,
      categories: m.requested_categories ?? [],
      answered: replied.has(m.id),
    }))
    .sort((a, b) => b.message.created_at.localeCompare(a.message.created_at))
}

export interface LifecycleRow {
  label: string
  confirmed: boolean
  detail: string
}
/** Lifecycle steps shown only where backend records support them; a decision is never account activation. */
export function lifecycle(app: PartnerApplication, history: HistoryItem[]): LifecycleRow[] {
  const reached = (s: string) => app.status === s || history.some((h) => h.to_status === s)
  const row = (label: string, confirmed: boolean, detail: string): LifecycleRow => ({
    label,
    confirmed,
    detail: confirmed ? detail : 'Not recorded yet.',
  })
  return [
    row('Application submitted', !!app.submitted_at, 'Recorded.'),
    row('Under review', REVIEW_STAGES.some(reached), 'A review stage has started.'),
    row('Decision communicated', DECISIONS.includes(app.status), 'See the decision above.'),
    row(
      'Pilot onboarding',
      reached('pilot_onboarding') || reached('scale_up'),
      'Managed by our team.',
    ),
    row(
      'Account activated',
      true,
      'You are signed in. Provisioning and activation dates are not exposed to partners.',
    ),
    {
      label: 'Partner operational status',
      confirmed: false,
      detail: 'Not reported by the backend.',
    },
  ]
}
