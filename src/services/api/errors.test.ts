import { NotConfiguredError, toAppError } from './errors'
import { requireEndpoint } from './client'

describe('api errors', () => {
  it('requireEndpoint throws NotConfiguredError when undocumented', () => {
    expect(() => requireEndpoint(undefined, 'Login')).toThrow(NotConfiguredError)
    expect(requireEndpoint('/x', 'Login')).toBe('/x')
  })

  it('toAppError normalises unknown errors', () => {
    expect(toAppError(new NotConfiguredError('Login')).code).toBe('NOT_CONFIGURED')
    expect(toAppError(new Error('boom')).message).toBe('boom')
    expect(toAppError('x').message).toBe('Something went wrong.')
  })
})

describe('toAppError backend envelope', () => {
  it('reads message and code from { message, error: { code } }', async () => {
    const { AxiosError } = await import('axios')
    const err = new AxiosError('x', '401', undefined, undefined, {
      status: 401,
      data: { success: false, message: 'Invalid credentials', error: { code: 'UNAUTHORIZED' } },
    } as never)
    expect(toAppError(err)).toEqual({
      message: 'Invalid credentials',
      status: 401,
      code: 'UNAUTHORIZED',
    })
  })
})
