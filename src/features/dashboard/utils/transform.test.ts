import { describe, expect, it } from 'vitest'
import type { EnquiryRow, ReviewerApplication } from '../types'
import {
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
})
