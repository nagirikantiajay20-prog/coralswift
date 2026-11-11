import { describe, expect, it } from 'vitest'
import type { ModuleKey } from '@/config/permissions'
import { recordPath } from './NotificationsFeedPage'

const only = (...m: ModuleKey[]) => (k: ModuleKey) => m.includes(k)
const id = '3f2b0c1e-0000-4000-8000-000000000001'

describe('admin feed record links', () => {
  it('links known record types to routes the role can open', () => {
    expect(recordPath('portal_application', id, false, only('applications'))).toBe(`/admin/applications/${id}`)
    expect(recordPath('portal_application', id, false, only('applicationReviews'))).toBe(
      `/admin/application-reviews/${id}`,
    )
    expect(recordPath('enquiry', id, false, only('enquiries'))).toBe(`/admin/enquiries/${id}`)
    expect(recordPath('enquiry', id, true, only('strategicEnquiries'))).toBe(`/admin/strategic-enquiries/${id}`)
  })
  it('never links when unauthorized, unknown, or without an id', () => {
    expect(recordPath('enquiry', id, true, only('enquiries'))).toBeUndefined()
    expect(recordPath('portal_application', id, false, only('dashboard'))).toBeUndefined()
    expect(recordPath('new_record_type', id, false, only('applications', 'enquiries'))).toBeUndefined()
    expect(recordPath(null, id, false, only('applications'))).toBeUndefined()
    expect(recordPath('enquiry', null, false, only('enquiries'))).toBeUndefined()
  })
  it('encodes the id so it cannot alter the path', () => {
    expect(recordPath('enquiry', '../x?y', false, only('enquiries'))).toBe('/admin/enquiries/..%2Fx%3Fy')
  })
})
