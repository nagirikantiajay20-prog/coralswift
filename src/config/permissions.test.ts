import { NAVIGATION } from './navigation'
import { canAccess } from './permissions'

describe('canAccess', () => {
  it('denies when there is no role', () => {
    expect(canAccess(undefined, 'dashboard')).toBe(false)
  })

  it('super admin reaches every module', () => {
    for (const item of NAVIGATION.flatMap((g) => g.items)) {
      expect(canAccess('super_administrator', item.module)).toBe(true)
    }
  })

  it('restricts strategic enquiries and admin areas for non-super roles', () => {
    for (const role of [
      'business_development_manager',
      'partner_reviewer',
      'content_administrator',
    ] as const) {
      expect(canAccess(role, 'strategicEnquiries')).toBe(false)
      expect(canAccess(role, 'users')).toBe(false)
      expect(canAccess(role, 'dashboard')).toBe(true)
    }
  })
})

import { canAccessWith } from './permissions'

describe('canAccessWith (backend permissions)', () => {
  it('falls back to the role hint when permissions are unknown', () => {
    expect(canAccessWith('content_administrator', 'content', null)).toBe(true)
    expect(canAccessWith('content_administrator', 'users', null)).toBe(false)
  })
  it('uses backend routes for probed modules and keeps the hint for others', () => {
    const paths = ['/api/v1/admin/enquiries', '/api/v1/admin/enquiries/{enquiry_id}']
    expect(canAccessWith('business_development_manager', 'enquiries', paths)).toBe(true)
    expect(canAccessWith('business_development_manager', 'reports', paths)).toBe(false)
    expect(canAccessWith('business_development_manager', 'dashboard', paths)).toBe(true)
  })
})
