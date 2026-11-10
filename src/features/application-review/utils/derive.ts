import {
  DOC_CATEGORIES,
  type HistoryItem,
  type PortalStatus,
  type ReviewDetail,
} from '@/features/partner-applications/types'
import { DECISION_STATUSES } from '@/features/partner-applications/schemas'
import { humanize } from '@/features/partner-applications/utils/format'

/**
 * The backend has NO checklist or scoring endpoint (verified in openapi.json). These items are
 * read-only, derived from fields the backend returns; they check presence/state, never merit.
 */
export interface CheckItem {
  group: string
  label: string
  done: boolean
  hint?: string
}

const filled = (v: unknown) =>
  Array.isArray(v) ? v.length > 0 : v !== null && v !== '' && v !== undefined

export function buildChecklist(d: ReviewDetail): CheckItem[] {
  const { application: a, organization: o } = d
  const latestElig = d.eligibility_verifications.some((e) => e.submission_no === a.submission_count)
  const items: CheckItem[] = [
    { group: 'Assignment', label: 'Reviewer assigned', done: !!a.assigned_reviewer_id },
    {
      group: 'Applicant',
      label: 'Authorized contact provided',
      done: filled(o.authorized_contacts),
    },
    ...(
      [
        ['registration_number', 'Registration number'],
        ['registered_address', 'Registered address'],
        ['country', 'Country'],
      ] as const
    ).map(([k, label]) => ({
      group: 'Organization',
      label: `${label} provided`,
      done: filled(o[k]),
    })),
    ...(
      [
        ['business_description', 'Business description'],
        ['service_categories', 'Service categories'],
        ['technical_capabilities', 'Technical capabilities'],
        ['infrastructure_summary', 'Infrastructure summary'],
        ['client_references', 'Client references'],
      ] as const
    ).map(([k, label]) => ({
      group: 'Business profile',
      label: `${label} provided`,
      done: filled(o[k]),
    })),
    {
      group: 'Eligibility',
      label: 'Human eligibility verification recorded for this submission',
      done: latestElig,
    },
    ...DOC_CATEGORIES.map((c) => {
      const doc = d.documents.find((x) => x.category === c)
      return {
        group: 'Documents',
        label: `${humanize(c)}: uploaded and accepted`,
        done: doc?.current_version?.review_status === 'accepted',
        hint: !doc?.current_version ? 'Not uploaded' : humanize(doc.current_version.review_status),
      }
    }),
    {
      group: 'Information requests',
      label: 'No open information requests',
      done: d.open_information_requests === 0,
    },
  ]
  return items
}

export const checklistProgress = (items: CheckItem[]) => ({
  done: items.filter((i) => i.done).length,
  total: items.length,
})

/** Statuses that record a reviewer decision (the backend has no separate decision endpoint or "approved" status). */
export const DECISION_STAGES = DECISION_STATUSES as PortalStatus[]

export const decisionsFrom = (history: HistoryItem[]) =>
  history
    .filter((h) => DECISION_STAGES.includes(h.to_status))
    .sort((x, y) => y.created_at.localeCompare(x.created_at))
