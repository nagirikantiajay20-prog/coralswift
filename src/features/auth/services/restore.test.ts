import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn()
const get = vi.fn()
vi.mock('@/services/api/client', async (orig) => ({
  ...(await orig<object>()),
  api: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a) },
}))

let duplicate = false
vi.mock('@/store/tabOwner', async (orig) => ({
  ...(await orig<object>()),
  ownedByAnotherLiveTab: () => Promise.resolve(duplicate),
}))

const ok = (data: unknown) => ({ data: { success: true, data } })
const staff = {
  id: 'u1',
  full_name: 'A',
  email: 'a@x.test',
  user_type: 'staff',
  staff_role: 'super_administrator',
}

async function fresh(rt: string | null) {
  vi.resetModules()
  sessionStorage.clear()
  if (rt) sessionStorage.setItem('cs.rt', rt)
  const { authService } = await import('./authService')
  const { useAuthStore } = await import('@/store/authStore')
  return { authService, useAuthStore }
}

describe('session restore on reload', () => {
  beforeEach(() => {
    post.mockReset()
    get.mockReset()
    duplicate = false
  })

  it('exchanges the stored refresh token once (single-flight), rotates it, loads /auth/me', async () => {
    const { authService, useAuthStore } = await fresh('rt1')
    post.mockResolvedValue(ok({ access_token: 'a2', refresh_token: 'rt2' }))
    get.mockResolvedValue(ok(staff))
    await Promise.all([authService.restore(), authService.restore()])
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith('/api/v1/auth/refresh', { refresh_token: 'rt1' })
    const s = useAuthStore.getState()
    expect(s.accessToken).toBe('a2')
    expect(s.user?.id).toBe('u1')
    expect(s.restoring).toBe(false)
    expect(sessionStorage.getItem('cs.rt')).toBe('rt2')
  })

  it('clears the stored token when refresh is rejected (revoked/expired) without retrying', async () => {
    const { authService, useAuthStore } = await fresh('bad')
    post.mockRejectedValue(new Error('401'))
    await authService.restore()
    expect(post).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().restoring).toBe(false)
    expect(sessionStorage.getItem('cs.rt')).toBeNull()
  })

  it('keeps the stored token when refresh fails transiently (offline / 5xx), so a later load can retry', async () => {
    const { authService, useAuthStore } = await fresh('rt1')
    post.mockRejectedValue(Object.assign(new Error('Network Error'), { isAxiosError: true }))
    await authService.restore()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().restoring).toBe(false)
    expect(sessionStorage.getItem('cs.rt')).toBe('rt1')
  })

  it('a duplicated tab never spends the one-time token another live tab owns', async () => {
    duplicate = true
    const { authService, useAuthStore } = await fresh('rt1')
    await authService.restore()
    expect(post).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().restoring).toBe(false)
  })

  it('does not persist the refresh token while MFA is pending', async () => {
    const { useAuthStore } = await fresh(null)
    useAuthStore.getState().setTokens('a', 'r', 'verify')
    expect(sessionStorage.getItem('cs.rt')).toBeNull()
  })
})
