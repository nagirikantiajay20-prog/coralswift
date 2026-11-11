import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { StaffSecurity } from './StaffSecurity'

const env = (data: unknown) => ({ data: { success: true, message: '', data } })
const session = (id: string, current: boolean) => ({
  id,
  created_at: '2026-11-01T00:00:00Z',
  last_used_at: null,
  user_agent: `Agent-${id}`,
  current,
})
const view = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <StaffSecurity />
    </QueryClientProvider>,
  )

beforeEach(() =>
  useAuthStore.setState({
    user: { id: 'u1', name: 'A', email: 'a@x.test', role: 'super_administrator' },
  }),
)
afterEach(() => vi.restoreAllMocks())

describe('StaffSecurity sessions', () => {
  it('lists sessions, offers sign-out only for other sessions and revokes one', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(env([session('s1', true), session('s2', false)]) as never)
    const del = vi.spyOn(api, 'delete').mockResolvedValue(env(null) as never)
    view()
    expect(await screen.findByText(/Agent-s1/)).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/api/v1/auth/sessions')
    expect(screen.getByText('(this session)')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Sign out' })
    expect(buttons).toHaveLength(1)
    fireEvent.click(buttons[0])
    await screen.findByText('Sign out this session?')
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign out' }).at(-1)!)
    await waitFor(() => expect(del).toHaveBeenCalledWith('/api/v1/auth/sessions/s2'))
  })

  it('signs out every other session after confirmation', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(env([session('s1', true), session('s2', false)]) as never)
    const del = vi.spyOn(api, 'delete').mockResolvedValue(env(null) as never)
    view()
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out all other sessions' }))
    expect(del).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out all' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('/api/v1/auth/sessions'))
  })

  it('hides bulk sign-out when only the current session exists', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(env([session('s1', true)]) as never)
    view()
    await screen.findByText(/Agent-s1/)
    expect(screen.queryByRole('button', { name: 'Sign out all other sessions' })).toBeNull()
  })

  it('shows an error with retry when the session list fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('boom'))
    view()
    expect(await screen.findByRole('button', { name: /retry/i }, { timeout: 4000 })).toBeInTheDocument()
  })
})

describe('StaffSecurity recovery codes', () => {
  beforeEach(() => vi.spyOn(api, 'get').mockResolvedValue(env([]) as never))

  it('only enables regeneration for a 6-digit code and posts it', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue(env({ recovery_codes: ['AAAA-1111', 'BBBB-2222'] }) as never)
    view()
    const submit = await screen.findByRole('button', { name: 'Replace recovery codes' })
    const input = screen.getByLabelText('Current authenticator code')
    fireEvent.change(input, { target: { value: '12ab' } })
    expect(submit).toBeDisabled()
    fireEvent.change(input, { target: { value: '123456' } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/auth/mfa/recovery-codes', { code: '123456' }))
    expect(await screen.findByText('AAAA-1111')).toBeInTheDocument()
    expect(screen.getByText(/Old codes no longer work/)).toBeInTheDocument()
  })

  it('shows no codes and keeps the form when the backend rejects the code', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('bad code'))
    view()
    fireEvent.change(await screen.findByLabelText('Current authenticator code'), {
      target: { value: '000000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Replace recovery codes' }))
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    expect(screen.queryByText(/Old codes no longer work/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Replace recovery codes' })).toBeInTheDocument()
  })
})
