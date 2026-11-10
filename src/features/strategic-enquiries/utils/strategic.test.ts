import { describe, expect, it } from 'vitest'
import type { EnquiryRow } from '@/features/business-enquiries/types'
import { strategicEntries, summarizeStrategic } from './strategic'

const row = (o: Partial<EnquiryRow>): EnquiryRow => ({
  id: 'x',
  reference_number: 'R',
  enquiry_type: 'strategic',
  subject: null,
  status: 'received',
  priority: 'normal',
  source: null,
  contact_name: null,
  contact_email: null,
  company_name: null,
  assigned_user_id: null,
  next_follow_up_at: null,
  created_at: '2026-01-01T00:00:00Z',
  ...o,
})

describe('summarizeStrategic', () => {
  it('counts statuses, pending follow-ups and unassigned open rows', () => {
    const s = summarizeStrategic(
      [
        row({ next_follow_up_at: '2020-01-01T00:00:00Z' }),
        row({ status: 'in_review', assigned_user_id: 'u' }),
        row({ status: 'closed', next_follow_up_at: '2020-01-01T00:00:00Z' }),
      ],
      Date.parse('2026-01-01'),
    )
    expect(s).toMatchObject({
      total: 3,
      received: 1,
      inReview: 1,
      closed: 1,
      pendingFollowUps: 1,
      overdue: 1,
      unassigned: 1,
    })
  })
})

describe('strategicEntries', () => {
  it('orders known strategic keys first and skips non-scalars', () => {
    const e = strategicEntries({
      zeta: 1,
      confidential_summary: 'c',
      discussion_type: 'merger',
      o: {},
    })
    expect(e.map(([k]) => k)).toEqual(['Discussion type', 'Confidential summary', 'Zeta'])
  })
})
