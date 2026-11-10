import { describe, expect, it } from 'vitest'
import type { EnquiryRow } from '@/features/business-enquiries/types'
import type { ReviewerApplication } from '@/features/partner-applications/types'
import {
  assigneeLabel,
  checkAssignment,
  fromApplication,
  fromEnquiry,
  tallyWorkload,
  visibleCategories,
} from './assignment'

const enq = (o: Partial<EnquiryRow> = {}): EnquiryRow => ({
  id: 'e1',
  reference_number: 'ENQ-1',
  enquiry_type: 'project',
  subject: 'S',
  status: 'received',
  priority: 'high',
  source: null,
  contact_name: 'Ann',
  contact_email: 'a@x.test',
  company_name: 'Acme',
  assigned_user_id: null,
  next_follow_up_at: null,
  created_at: '2026-01-01T00:00:00Z',
  ...o,
})
const app: ReviewerApplication = {
  id: 'a1',
  reference: 'APP-1',
  organization_id: 'o',
  organization_name: 'Org',
  status: 'submitted',
  pathway: 'p',
  assigned_reviewer_id: 'r1',
  submission_count: 1,
  submitted_at: '2026-02-01T00:00:00Z',
}

describe('transformation', () => {
  it('maps enquiries and applications without inventing fields', () => {
    const e = fromEnquiry(enq({ next_follow_up_at: '2000-01-01T00:00:00Z' }), 'project')
    expect(e).toMatchObject({ key: 'project:e1', priority: 'high', overdue: true, pending: true })
    const a = fromApplication(app)
    expect(a).toMatchObject({
      key: 'applications:a1',
      priority: null,
      overdue: null,
      contactEmail: null,
    })
    expect(a.assigneeId).toBe('r1')
  })
  it('keeps the same id in different categories distinct', () => {
    expect(fromEnquiry(enq(), 'project').key).not.toBe(fromEnquiry(enq(), 'strategic').key)
  })
  it('closed enquiries and withdrawn applications are not pending', () => {
    expect(fromEnquiry(enq({ status: 'closed' }), 'general').pending).toBe(false)
    expect(fromApplication({ ...app, status: 'withdrawn' }).pending).toBe(false)
  })
})

describe('record-type separation and strategic confidentiality', () => {
  const can = (allowed: string[]) => (m: string) => allowed.includes(m)
  it('hides strategic and applications unless the module is allowed', () => {
    const keys = visibleCategories(can(['enquiries']) as never).map((c) => c.key)
    expect(keys).toEqual(['general', 'project'])
  })
  it('shows strategic only with strategicEnquiries access', () => {
    const keys = visibleCategories(can(['enquiries', 'strategicEnquiries']) as never).map(
      (c) => c.key,
    )
    expect(keys).toContain('strategic')
    expect(keys).not.toContain('applications')
  })
  it('shows nothing without access', () => {
    expect(visibleCategories(() => false)).toEqual([])
  })
})

describe('assignment validation', () => {
  it('requires a target when clearing is not allowed (applications)', () => {
    expect(checkAssignment(null, null, false)).toBe('empty')
  })
  it('rejects no-op changes', () => {
    expect(checkAssignment('u1', 'u1', true)).toBe('same')
    expect(checkAssignment(null, null, true)).toBe('same')
  })
  it('assigns an unassigned record directly and confirms reassignment', () => {
    expect(checkAssignment(null, 'u1', true)).toBe('ok')
    expect(checkAssignment('u1', 'u2', true)).toBe('confirm')
    expect(checkAssignment('u1', null, true)).toBe('confirm')
  })
})

describe('workload and labels', () => {
  it('tallies assigned, pending, overdue per assignee and ignores unassigned', () => {
    const rows = [
      fromEnquiry(enq({ id: '1', assigned_user_id: 'u1' }), 'general'),
      fromEnquiry(enq({ id: '2', assigned_user_id: 'u1', status: 'closed' }), 'general'),
      fromEnquiry(
        enq({ id: '3', assigned_user_id: 'u1', next_follow_up_at: '2000-01-01T00:00:00Z' }),
        'project',
      ),
      fromEnquiry(enq({ id: '4' }), 'project'),
      fromApplication(app),
    ]
    const w = tallyWorkload(rows)
    expect(w.find((x) => x.assigneeId === 'u1')).toMatchObject({
      assigned: 3,
      pending: 2,
      overdue: 1,
      byCategory: { general: 2, project: 1 },
    })
    expect(w).toHaveLength(2)
    expect(tallyWorkload([])).toEqual([])
  })
  it('labels assignees', () => {
    const names = new Map([['u2', 'Bo']])
    expect(assigneeLabel(null, 'u1')).toBe('Unassigned')
    expect(assigneeLabel('u1', 'u1')).toBe('Me')
    expect(assigneeLabel('u2', 'u1', names)).toBe('Bo')
    expect(assigneeLabel('abcdefghijkl', 'u1')).toBe('abcdefgh')
  })
})
