import { describe, expect, it } from 'vitest'
import type { EnquiryRow } from '../types'
import { isOverdue, projectGroup, summarize } from './format'

const row = (o: Partial<EnquiryRow>): EnquiryRow => ({
  id: '1',
  reference_number: 'R',
  enquiry_type: 'project',
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

describe('enquiry format', () => {
  it('groups project categories per PRD', () => {
    expect(projectGroup({ project_category: 'custom_software' })).toBe('IT')
    expect(projectGroup({ project_category: 'data_entry' })).toBe('Non-IT')
    expect(projectGroup(null)).toBeUndefined()
  })
  it('summarizes only returned rows', () => {
    const now = Date.parse('2026-06-01T00:00:00Z')
    const rows = [
      row({ next_follow_up_at: '2026-05-01T00:00:00Z' }),
      row({ status: 'closed', next_follow_up_at: '2026-05-01T00:00:00Z' }),
      row({ status: 'in_review', assigned_user_id: 'u' }),
    ]
    expect(summarize(rows, now)).toMatchObject({
      total: 3,
      received: 1,
      inReview: 1,
      closed: 1,
      unassigned: 1,
      overdue: 1,
    })
    expect(isOverdue(rows[1], now)).toBe(false)
  })
})
