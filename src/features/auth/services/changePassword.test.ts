import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn().mockResolvedValue({})
vi.mock('@/services/api/client', async (orig) => ({
  ...(await orig<object>()),
  api: { post: (...a: unknown[]) => post(...a) },
}))

import { authService } from './authService'

describe('authService.changePassword', () => {
  beforeEach(() => post.mockClear())
  it('posts the backend contract { current_password, new_password } to /auth/change-password', async () => {
    await authService.changePassword({
      currentPassword: 'old-Passw0rd!',
      password: 'new-Passw0rd!',
      confirmPassword: 'new-Passw0rd!',
    })
    expect(post).toHaveBeenCalledWith('/api/v1/auth/change-password', {
      current_password: 'old-Passw0rd!',
      new_password: 'new-Passw0rd!',
    })
  })
})
