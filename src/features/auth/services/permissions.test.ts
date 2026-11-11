import { afterEach, describe, expect, it, vi } from 'vitest'
import { canAccessWith, MODULE_PROBES, type ModuleKey } from '@/config/permissions'
import { api } from '@/services/api/client'
import { authService } from './authService'

const env = (data: unknown) => ({ data: { success: true, message: '', data } })
afterEach(() => vi.restoreAllMocks())

describe('authService.loadPermissions (GET /auth/permissions)', () => {
  it('keeps only GET paths and passes role_matrix through', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(
      env({
        account_type: 'staff',
        staff_role: 'business_development_manager',
        modules: [
          {
            module: 'enquiries',
            endpoints: [
              { method: 'GET', path: '/api/v1/admin/enquiries' },
              { method: 'post', path: '/api/v1/admin/enquiries/{id}/assign' },
            ],
          },
          { module: 'feed', endpoints: [{ method: 'get', path: '/api/v1/admin/feed' }] },
        ],
        role_matrix: { business_development_manager: ['enquiries'] },
      }) as never,
    )
    const r = await authService.loadPermissions()
    expect(get).toHaveBeenCalledWith('/api/v1/auth/permissions')
    expect(r.paths).toEqual(['/api/v1/admin/enquiries', '/api/v1/admin/feed'])
    expect(r.matrix).toEqual({ business_development_manager: ['enquiries'] })
  })

  it('returns null (role hint applies) for an empty module list', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(
      env({ account_type: 'staff', staff_role: null, modules: [], role_matrix: null }) as never,
    )
    expect(await authService.loadPermissions()).toEqual({ paths: null, matrix: null })
  })

  it('returns null instead of throwing when the call fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('403'))
    expect(await authService.loadPermissions()).toEqual({ paths: null, matrix: null })
  })
})

describe('permission mapping', () => {
  const routes = Object.entries(MODULE_PROBES) as [ModuleKey, string][]

  it('grants each probed module only when the backend lists a GET route under its prefix', () => {
    for (const [module, probe] of routes) {
      expect(canAccessWith('super_administrator', module, [`/api/v1${probe}/anything`])).toBe(true)
      expect(canAccessWith('super_administrator', module, ['/api/v1/admin/unrelated'])).toBe(false)
    }
  })

  it('lets the backend override the role hint in both directions', () => {
    // content administrators are not hinted to see users; a backend grant wins.
    expect(canAccessWith('content_administrator', 'users', ['/api/v1/admin/users'])).toBe(true)
    // a super administrator hinted "all" loses a module the backend does not list.
    expect(canAccessWith('super_administrator', 'auditLogs', ['/api/v1/admin/users'])).toBe(false)
  })

  it('keeps the role hint for modules without a probe', () => {
    expect(canAccessWith('partner_reviewer', 'dashboard', ['/api/v1/admin/users'])).toBe(true)
    expect(canAccessWith('partner_reviewer', 'strategicEnquiries', ['/api/v1/admin/users'])).toBe(false)
  })

  it('denies without a role', () => {
    expect(canAccessWith(undefined, 'enquiries', ['/api/v1/admin/enquiries'])).toBe(false)
  })
})
