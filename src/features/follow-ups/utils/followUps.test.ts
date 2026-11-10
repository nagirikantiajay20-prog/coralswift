import { describe, expect, it } from 'vitest'
import type { EnquiryRow, FollowUp } from '@/features/business-enquiries/types'
import {
  entryLabel,
  followUpState,
  groupByDay,
  hideRestricted,
  inDayRange,
  isRowOverdue,
  metaTotal,
  recordPath,
  visibleEnquiryTypes,
} from './followUps'

const NOW = Date.parse('2026-06-15T12:00:00Z')
const fu = (o: Partial<FollowUp>): FollowUp => ({
  id: '1',
  author_id: 'a',
  note: 'n',
  due_at: null,
  completed_at: null,
  created_at: '2026-06-01T00:00:00Z',
  ...o,
})
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

describe('follow-up state', () => {
  it('derives completed / overdue / open / note', () => {
    expect(
      followUpState(
        fu({ completed_at: '2026-06-02T00:00:00Z', due_at: '2026-06-01T00:00:00Z' }),
        NOW,
      ),
    ).toBe('completed')
    expect(followUpState(fu({ due_at: '2026-06-10T00:00:00Z' }), NOW)).toBe('overdue')
    expect(followUpState(fu({ due_at: '2026-06-20T00:00:00Z' }), NOW)).toBe('open')
    expect(followUpState(fu({}), NOW)).toBe('note')
  })
  it('labels entries as internal, never external', () => {
    expect(entryLabel(fu({}))).toBe('Internal note')
    expect(entryLabel(fu({ due_at: '2026-06-20T00:00:00Z' }))).toBe('Internal follow-up')
  })
})

describe('overdue and date filtering', () => {
  it('closed enquiries are never overdue', () => {
    const past = '2026-06-01T00:00:00Z'
    expect(isRowOverdue({ status: 'received', next_follow_up_at: past }, NOW)).toBe(true)
    expect(isRowOverdue({ status: 'closed', next_follow_up_at: past }, NOW)).toBe(false)
    expect(isRowOverdue({ status: 'received', next_follow_up_at: null }, NOW)).toBe(false)
  })
  it('range is inclusive and open-ended', () => {
    const iso = new Date(2026, 5, 15, 10).toISOString()
    expect(inDayRange(iso, '2026-06-15', '2026-06-15')).toBe(true)
    expect(inDayRange(iso, '2026-06-16', '')).toBe(false)
    expect(inDayRange(iso, '', '2026-06-14')).toBe(false)
    expect(inDayRange(iso, '', '')).toBe(true)
  })
  it('groups by day ascending and skips rows without a date', () => {
    const g = groupByDay([
      row({ id: 'b', next_follow_up_at: new Date(2026, 5, 20, 9).toISOString() }),
      row({ id: 'a', next_follow_up_at: new Date(2026, 5, 10, 9).toISOString() }),
      row({ id: 'c', next_follow_up_at: new Date(2026, 5, 20, 15).toISOString() }),
      row({ id: 'x' }),
    ])
    expect(g.map((x) => x.day)).toEqual(['2026-06-10', '2026-06-20'])
    expect(g[1].rows.map((r) => r.id)).toEqual(['b', 'c'])
  })
})

describe('record-type separation and confidentiality', () => {
  it('routes each record type to its own workspace', () => {
    expect(recordPath('application', 'x')).toBe('/admin/applications/x')
    expect(recordPath('strategic', 'x')).toBe('/admin/strategic-enquiries/x')
    expect(recordPath('project', 'x')).toBe('/admin/enquiries/x')
  })
  it('hides strategic records and filter option without strategic access', () => {
    const rows = [row({ id: '1' }), row({ id: '2', enquiry_type: 'strategic' })]
    expect(hideRestricted(rows, false).map((r) => r.id)).toEqual(['1'])
    expect(hideRestricted(rows, true)).toHaveLength(2)
    expect(visibleEnquiryTypes(false)).not.toContain('strategic')
    expect(visibleEnquiryTypes(true)).toContain('strategic')
  })
  it('reads the backend total only when present', () => {
    expect(metaTotal({ total: 7 })).toBe(7)
    expect(metaTotal({})).toBeUndefined()
    expect(metaTotal(null)).toBeUndefined()
  })
})
