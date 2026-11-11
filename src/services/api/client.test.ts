import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, AxiosResponse } from 'axios'
import { api, configureApiAuth } from './client'

const res = (config: object, status: number): AxiosResponse =>
  ({ data: {}, status, statusText: '', headers: {}, config }) as AxiosResponse

describe('401 handling', () => {
  const onUnauthorized = vi.fn()
  let token = 'old'
  let refreshCalls = 0
  beforeEach(() => {
    token = 'old'
    refreshCalls = 0
    onUnauthorized.mockReset()
    api.defaults.adapter = ((config) => {
      const ok = config.headers.get('Authorization') === 'Bearer new'
      const r = res(config, ok ? 200 : 401)
      return ok ? Promise.resolve(r) : Promise.reject({ isAxiosError: true, config, response: r })
    }) as AxiosAdapter
  })

  it('shares one refresh between concurrent 401s, then retries each once', async () => {
    configureApiAuth({
      getToken: () => token,
      refresh: async () => {
        refreshCalls++
        await Promise.resolve()
        token = 'new'
        return true
      },
      onUnauthorized,
    })
    const out = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')])
    expect(out.map((r) => r.status)).toEqual([200, 200, 200])
    expect(refreshCalls).toBe(1)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('keeps the session when the refresh itself fails transiently', async () => {
    configureApiAuth({
      getToken: () => token,
      refresh: () => Promise.reject(new Error('Network Error')),
      onUnauthorized,
    })
    await expect(api.get('/a')).rejects.toBeTruthy()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('expires the session when refresh fails, and never retries login/refresh calls', async () => {
    configureApiAuth({ getToken: () => token, refresh: async () => false, onUnauthorized })
    await expect(api.get('/a')).rejects.toBeTruthy()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    await expect(api.post('/api/v1/auth/refresh')).rejects.toBeTruthy()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})
