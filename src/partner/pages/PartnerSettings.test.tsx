import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { PARTNER_NAVIGATION } from '../config/navigation'
import PartnerPrivacyPage from './PartnerPrivacyPage'
import PartnerSecurityPage from './PartnerSecurityPage'
import PartnerSettingsPage, { PartnerAccountSection } from './PartnerSettingsPage'

const env = (data: unknown) => ({ data: { success: true, message: 'ok', data } })
const session = (o: object) => ({
  id: 's',
  created_at: '2026-01-01T00:00:00Z',
  last_used_at: null,
  user_agent: 'UA',
  current: false,
  ...o,
})

const view = (path: string) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/partner/settings" element={<PartnerSettingsPage />}>
            <Route index element={<PartnerAccountSection />} />
            <Route path="security" element={<PartnerSecurityPage />} />
            <Route path="privacy" element={<PartnerPrivacyPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() =>
  useAuthStore.getState().setPartner({
    id: 'p1',
    name: 'Pat',
    email: 'p@x.test',
    organizationId: 'o1',
    organizationName: 'Acme',
  }),
)
afterEach(() => {
  useAuthStore.getState().clear()
  vi.restoreAllMocks()
})

describe('Phase 35 settings', () => {
  it('shows read-only account info, no calls, and a nav entry', () => {
    const spies = (['get', 'post', 'put', 'patch', 'delete'] as const).map((m) => vi.spyOn(api, m))
    view('/partner/settings')
    expect(screen.getByText('p@x.test')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
    spies.forEach((s) => expect(s).not.toHaveBeenCalled())
    expect(PARTNER_NAVIGATION.map((n) => n.to)).toContain('/partner/settings')
  })

  it('lists sessions, revokes only non-current ones after confirmation', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValue(
        env([session({ id: 'cur', current: true }), session({ id: 'other', user_agent: 'Phone' })]),
      )
    const del = vi.spyOn(api, 'delete').mockResolvedValue(env(null))
    view('/partner/settings/security')
    await screen.findByText('Phone')
    expect(get).toHaveBeenCalledWith('/api/v1/auth/sessions')
    expect(screen.getAllByRole('button', { name: 'Sign out' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(del).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign out' }).at(-1)!)
    await waitFor(() => expect(del).toHaveBeenCalledWith('/api/v1/auth/sessions/other'))
  })

  it('shows a session error (e.g. expired) without crashing', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: {} },
    })
    view('/partner/settings/security')
    expect(
      await screen.findByText(/session has expired/i, {}, { timeout: 4000 }),
    ).toBeInTheDocument()
  })

  it('password: change form posts the backend contract; reset email only after confirmation', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(env([]))
    const post = vi.spyOn(api, 'post').mockResolvedValue(env(null))
    view('/partner/settings/security')
    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'Old-Passw0rd!x' },
    })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'New-Passw0rd!x' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'Different-1x!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(post).not.toHaveBeenCalled() // mismatch blocked client-side
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'New-Passw0rd!x' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/auth/change-password', {
        current_password: 'Old-Passw0rd!x',
        new_password: 'New-Passw0rd!x',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: /reset link/i }))
    expect(post).not.toHaveBeenCalledWith('/api/v1/auth/password-reset/request', expect.anything())
    fireEvent.click(await screen.findByRole('button', { name: 'Send link' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/auth/password-reset/request', {
        email: 'p@x.test',
      }),
    )
  })

  it('MFA: recovery codes require a code; invalid code shows the backend error', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(env([]))
    vi.spyOn(api, 'post').mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { message: 'Invalid code' } },
    })
    view('/partner/settings/security')
    expect(screen.queryByText(/mfa is (on|off)/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Replace recovery codes' }))
    fireEvent.change(screen.getByLabelText('Current authenticator code'), {
      target: { value: '000000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Replace recovery codes' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('privacy: access request posts with the account email; deletion needs confirmation', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue(env({ reference: 'PR-1' }))
    view('/partner/settings/privacy')
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }))
    await screen.findByText(/PR-1/)
    expect(post).toHaveBeenCalledWith('/api/v1/privacy/requests', {
      email: 'p@x.test',
      kind: 'access',
      details: undefined,
    })

    fireEvent.change(screen.getByLabelText('Request type'), { target: { value: 'deletion' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }))
    expect(post).toHaveBeenCalledTimes(1)
    fireEvent.click(
      await screen
        .findByRole('button', { name: /Submit request$/, hidden: false })
        .then(() => screen.getAllByRole('button', { name: 'Submit request' }).at(-1)!),
    )
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(post.mock.calls[1][1]).toMatchObject({ kind: 'deletion' })
  })
})
