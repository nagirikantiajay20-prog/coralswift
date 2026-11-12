import { describe, expect, it } from 'vitest'
import type { EnquiryRow, ReviewerApplication } from '../types'
import {
  APPROVED,
  countStatuses,
  IN_REVIEW,
  onboardingActivity,
  recentDecisions,
  dailyCounts,
  numericEntries,
  onboardingProgress,
  statusDistribution,
  upcomingFollowUps,
} from './transform'

const app = (status: ReviewerApplication['status'], at: string | null) =>
  ({ id: status + at, status, submitted_at: at }) as ReviewerApplication

describe('dashboard transforms', () => {
  it('counts statuses and stages from rows', () => {
    const rows = [
      app('submitted', '2026-01-02T01:00:00Z'),
      app('submitted', '2026-01-02T05:00:00Z'),
      app('rejected', null),
    ]
    expect(statusDistribution(rows)).toEqual([
      { name: 'Submitted', value: 2 },
      { name: 'Rejected', value: 1 },
    ])
    expect(onboardingProgress(rows)[0]).toEqual({ name: 'Submitted', value: 2 })
    expect(dailyCounts(rows, (r) => r.submitted_at)).toEqual([{ day: '2026-01-02', value: 2 }])
  })
  it('lists only open enquiries with a follow-up, soonest first', () => {
    const e = (status: EnquiryRow['status'], at: string | null) =>
      ({ status, next_follow_up_at: at }) as EnquiryRow
    const out = upcomingFollowUps([
      e('closed', '2026-01-01'),
      e('received', '2026-03-01'),
      e('in_review', '2026-02-01'),
      e('received', null),
    ])
    expect(out.map((x) => x.next_follow_up_at)).toEqual(['2026-02-01', '2026-03-01'])
  })
  it('keeps only numeric entries of untyped dicts', () => {
    expect(numericEntries({ open_leads: 3, name: 'x', nested: {} })).toEqual([
      { key: 'open_leads', label: 'open leads', value: 3 },
    ])
  })
  it('maps pending/approved/decisions/onboarding feed from backend fields', () => {
    const a = (status: ReviewerApplication['status'], decided_at: string | null) =>
      ({ id: status + decided_at, status, decided_at }) as ReviewerApplication
    const rows = [
      a('submitted', null),
      a('information_requested', null),
      a('pilot_onboarding', '2026-02-01T00:00:00Z'),
      a('rejected', '2026-03-01T00:00:00Z'),
      a('scale_up', null),
    ]
    expect(countStatuses(rows, IN_REVIEW)).toBe(2)
    expect(countStatuses(rows, APPROVED)).toBe(2)
    expect(recentDecisions(rows).map((r) => r.status)).toEqual(['rejected', 'pilot_onboarding'])
    const feed = onboardingActivity([
      {
        id: 'o1',
        reference: 'ONB-1',
        organization_name: 'Acme',
        started_at: '2026-01-01T00:00:00Z',
        completed_at: null,
        first_login_at: null,
        tasks: [
          { id: 't1', name: 'KYC', status: 'completed', completed_at: '2026-01-05T00:00:00Z' },
        ],
      },
    ])
    expect(feed.map((e) => e.text)).toEqual(['Task completed: KYC', 'Onboarding ONB-1 started'])
  })
})
