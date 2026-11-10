import type { ApplicationDocument, PortalStatus } from '@/features/partner-applications/types'
import { APPROVED_STATUSES } from '../types'

export interface DocSummary {
  total: number
  verified: number
  awaiting: number
  needsAction: number
}

/** Counts by the backend's per-version review_status (pending/accepted/rejected/clarification_needed). */
export function summarizeDocs(docs: ApplicationDocument[]): DocSummary {
  const s: DocSummary = { total: docs.length, verified: 0, awaiting: 0, needsAction: 0 }
  for (const d of docs) {
    const r = d.current_version?.review_status
    if (r === 'accepted') s.verified++
    else if (r === 'rejected' || r === 'clarification_needed' || !d.current_version) s.needsAction++
    else s.awaiting++
  }
  return s
}

/**
 * Reasons provisioning must stay disabled. UX guard only: the backend enforces its own rules
 * (it documents none beyond super-administrator-only and 409 on conflict).
 */
export function provisioningBlockers(status: PortalStatus, docs: ApplicationDocument[]): string[] {
  const out: string[] = []
  if (!APPROVED_STATUSES.includes(status))
    out.push('Application has not reached the onboarding stage.')
  const s = summarizeDocs(docs)
  if (s.total === 0) out.push('No documents have been submitted.')
  else if (s.verified < s.total)
    out.push(`${s.total - s.verified} of ${s.total} document(s) not yet verified.`)
  return out
}

/** Prefill from authorized_contacts (free-form backend objects): only well-known string keys. */
export function contactPrefill(rows: Record<string, unknown>[] | null) {
  const c = rows?.[0] ?? {}
  const str = (...k: string[]) =>
    k.map((x) => c[x]).find((v) => typeof v === 'string') as string | undefined
  return { full_name: str('full_name', 'name') ?? '', email: str('email') ?? '' }
}
