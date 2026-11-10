import type { StatusTone } from '@/components/common/StatusBadge'
import type {
  Completion,
  HistoryItem,
  PartnerApplication,
  PartnerDocument,
  PartnerMessage,
} from '../services/partnerDashboardService'
import { PARTNER_ROUTES as R } from '../config/routes'
import { infoRequests, lifecycle, TERMINAL, type LifecycleRow } from './applicationStatus'
import { needsAction } from './documentFiles'

/**
 * Onboarding is DERIVED from existing partner-safe backend data. The backend (openapi.json
 * 2026-11-10) has NO onboarding record, checklist, task, completion or partner-action endpoint;
 * its only onboarding signal is application status `pilot_onboarding` / `scale_up` plus history.
 * Nothing here is stored or completed client-side, and nothing implies approval or activation.
 */
export const ONBOARDING_STAGES = [
  ['pilot_onboarding', 'Pilot onboarding'],
  ['scale_up', 'Scale-up'],
] as const
const KEYS: string[] = ONBOARDING_STAGES.map(([k]) => k)

export type OnboardingPhase = 'not_started' | 'pilot_onboarding' | 'scale_up' | 'closed'
export interface OnboardingSummary {
  phase: OnboardingPhase
  label: string
  tone: StatusTone
  detail: string
  /** First history entry that reached pilot_onboarding (the only initiation date the backend gives). */
  initiatedAt: string | null
  /** Latest partner-visible history entry; no dedicated last-updated field exists. */
  lastUpdatedAt: string | null
}

const newest = (h: HistoryItem[]) => [...h].sort((a, b) => b.created_at.localeCompare(a.created_at))

export function onboardingSummary(
  app: PartnerApplication,
  history: HistoryItem[],
): OnboardingSummary {
  const sorted = newest(history)
  const reached = (s: string) => app.status === s || history.some((h) => h.to_status === s)
  const initiatedAt =
    [...sorted].reverse().find((h) => KEYS.includes(h.to_status))?.created_at ?? null
  const lastUpdatedAt = sorted[0]?.created_at ?? null
  const base = { initiatedAt, lastUpdatedAt }
  if (TERMINAL.includes(app.status))
    return {
      ...base,
      phase: 'closed',
      label: app.status === 'rejected' ? 'Application not proceeding' : 'Application withdrawn',
      tone: app.status === 'rejected' ? 'danger' : 'neutral',
      detail: 'No onboarding is in progress for this application.',
    }
  if (reached('scale_up'))
    return {
      ...base,
      phase: 'scale_up',
      label: 'Scale-up',
      tone: 'success',
      detail: 'Our team manages this stage with you. The backend records no onboarding completion.',
    }
  if (reached('pilot_onboarding'))
    return {
      ...base,
      phase: 'pilot_onboarding',
      label: 'Onboarding initiated',
      tone: 'success',
      detail: 'Pilot onboarding is managed by Coral Swift staff with you.',
    }
  return {
    ...base,
    phase: 'not_started',
    label: 'Not started',
    tone: 'neutral',
    detail:
      'Onboarding begins only after Coral Swift communicates a decision to proceed. Application review is a separate process.',
  }
}

export interface OnboardingStage {
  key: string
  label: string
  state: 'complete' | 'current' | 'upcoming'
  at: string | null
}
/** Only backend-modelled onboarding stages. A stage is complete only if a later one was recorded. */
export function onboardingTracker(
  app: PartnerApplication,
  history: HistoryItem[],
): OnboardingStage[] {
  const s = onboardingSummary(app, history)
  if (s.phase === 'not_started' || s.phase === 'closed') return []
  const at = (k: string) =>
    [...history].reverse().find((h) => h.to_status === k)?.created_at ?? null
  const ci = KEYS.indexOf(s.phase)
  return ONBOARDING_STAGES.map(([key, label], i) => ({
    key,
    label,
    at: at(key),
    state: i < ci ? 'complete' : i === ci ? 'current' : 'upcoming',
  }))
}

export interface PartnerAction {
  id: string
  title: string
  description: string
  to: string
  linkLabel: string
}
/**
 * Outstanding partner actions from real backend data only. Each one links to the module that
 * already owns the work (Application, Documents, Company profile); nothing is duplicated.
 */
export function partnerActions(input: {
  messages: PartnerMessage[] | undefined
  documents: PartnerDocument[] | undefined
  completion: Completion | null | undefined
}): PartnerAction[] {
  const out: PartnerAction[] = []
  for (const r of infoRequests(input.messages).filter((x) => !x.answered))
    out.push({
      id: `req-${r.message.id}`,
      title: r.categories.length
        ? 'Respond to a document request'
        : 'Respond to a reviewer question',
      description: r.message.body,
      to: R.application,
      linkLabel: 'Respond in Application',
    })
  for (const d of input.documents ?? [])
    if (needsAction(d.current_version))
      out.push({
        id: `doc-${d.id}`,
        title: 'Replace a document',
        description: `${d.category.replace(/_/g, ' ')}: the reviewer requested a replacement.`,
        to: R.documents,
        linkLabel: 'Go to Documents',
      })
  if (input.completion && !input.completion.complete && input.completion.missing_fields.length)
    out.push({
      id: 'profile',
      title: 'Complete missing company information',
      description: input.completion.missing_fields.map((f) => f.replace(/_/g, ' ')).join(', '),
      to: R.company,
      linkLabel: 'Update company profile',
    })
  return out
}

/** Partner-visible reviewer messages from onboarding initiation onward (no per-activity link exists). */
export function onboardingMessages(
  messages: PartnerMessage[] | undefined,
  initiatedAt: string | null,
) {
  if (!initiatedAt) return []
  const replied = new Set(
    (messages ?? []).filter((m) => !m.from_reviewer && m.in_reply_to).map((m) => m.in_reply_to),
  )
  const reqs = new Set(infoRequests(messages).map((r) => r.message.id))
  return (messages ?? [])
    .filter((m) => m.from_reviewer && m.created_at >= initiatedAt)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((m) => ({ message: m, needsResponse: reqs.has(m.id), answered: replied.has(m.id) }))
}

/** Onboarding-relevant history only (entries from initiation onward). */
export function onboardingHistory(history: HistoryItem[]): HistoryItem[] {
  const first = [...history].reverse().find((h) => KEYS.includes(h.to_status))?.created_at
  return first ? newest(history).filter((h) => h.created_at >= first) : []
}

/** Application lifecycle plus an explicit, never-confirmed "Onboarding completed" row. */
export function onboardingLifecycle(
  app: PartnerApplication,
  history: HistoryItem[],
): LifecycleRow[] {
  const rows = lifecycle(app, history)
  const i = rows.findIndex((r) => r.label === 'Pilot onboarding')
  rows.splice(i + 1, 0, {
    label: 'Onboarding completed',
    confirmed: false,
    detail: 'No completion record is exposed to partners.',
  })
  return rows
}
