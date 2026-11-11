import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { ProfileEditor } from './ProfileEditor'

const me = { id: 'u1', email: 'a@x.test', full_name: 'Asha Rao', phone: null, mfa_enabled: true }
const env = (data: unknown) => ({ data: { success: true, message: '', data } })
const view = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ProfileEditor />
    </QueryClientProvider>,
  )
afterEach(() => vi.restoreAllMocks())

describe('ProfileEditor', () => {
  it('sends only changed fields and updates the session name', async () => {
    useAuthStore.setState({
      user: { id: 'u1', name: 'Asha Rao', email: 'a@x.test', role: 'super_administrator' },
    })
    vi.spyOn(api, 'get').mockResolvedValue(env(me))
    const patch = vi
      .spyOn(api, 'patch')
      .mockResolvedValue(env({ ...me, full_name: 'Asha R', phone: '+919876543210' }))
    view()
    await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveValue('Asha Rao'))
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Asha R' } })
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: '+919876543210' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(patch).toHaveBeenCalled())
    expect(patch.mock.calls[0][1]).toEqual({ full_name: 'Asha R', phone: '+919876543210' })
    await waitFor(() => expect(useAuthStore.getState().user?.name).toBe('Asha R'))
  })
  it('rejects a phone number that is not in international format', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(env(me))
    const patch = vi.spyOn(api, 'patch')
    view()
    await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveValue('Asha Rao'))
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: '98765 43210' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/international format/)
    expect(patch).not.toHaveBeenCalled()
  })
})
