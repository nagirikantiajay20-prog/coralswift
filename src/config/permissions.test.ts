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
