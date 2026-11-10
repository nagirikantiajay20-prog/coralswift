import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '@/features/auth/components/guards'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { PartnerRoute } from './components/PartnerRoute'
import PartnerLoginPage from './pages/PartnerLoginPage'
import { partnerAuthService } from './services/partnerAuthService'
import { partnerDestination } from './utils/destination'

const partner = {
  id: 'p1',
  name: 'Pat',
  email: 'pat@example.com',
  organizationId: 'o1',
  organizationName: 'Acme Ltd',
}
const staff = {
  id: 's1',
  name: 'Sam',
  email: 'sam@example.com',
  role: 'super_administrator' as const,
}
const envelope = (data: unknown) => ({ data: { success: true, message: 'ok', data } })
const me = (o: object) =>
  envelope({
    id: 'p1',
    email: 'pat@example.com',
    full_name: 'Pat',
    user_type: 'partner',
    staff_role: null,
    organization: { id: 'o1', legal_name: 'Acme Ltd' },
    ...o,
  })

const app = (path: string) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
  >
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/partner/login" element={<PartnerLoginPage />} />
        <Route element={<PartnerRoute />}>
          <Route path="/partner/dashboard" element={<p>partner area</p>} />
        </Route>
        <Route path="/login" element={<p>admin login</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<p>admin area</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>
)

beforeEach(() => useAuthStore.getState().clear())
afterEach(() => vi.restoreAllMocks())

describe('partner route guard', () => {
  it('redirects unauthenticated users to partner login (not admin login)', () => {
    render(app('/partner/dashboard'))
    expect(screen.getByText('Partner sign in')).toBeInTheDocument()
  })
  it('admits a partner session', () => {
    useAuthStore.getState().setPartner(partner)
    render(app('/partner/dashboard'))
    expect(screen.getByText('partner area')).toBeInTheDocument()
  })
  it('denies a staff session and does not promote it to partner', () => {
    useAuthStore.getState().setUser(staff)
    render(app('/partner/dashboard'))
    expect(screen.getByText('Access denied')).toBeInTheDocument()
    expect(screen.queryByText('partner area')).toBeNull()
  })
  it('a partner session does not pass the admin guard', () => {
    useAuthStore.getState().setPartner(partner)
    render(app('/admin/dashboard'))
    expect(screen.queryByText('admin area')).toBeNull()
  })
  it('session expiry returns the partner to login with the expired notice', () => {
    useAuthStore.getState().setPartner(partner)
    useAuthStore.getState().expire()
    expect(useAuthStore.getState().partner).toBeNull()
    render(app('/partner/dashboard'))
    expect(screen.getByText(/session expired/i)).toBeInTheDocument()
  })
  it('logout state clears the partner session', () => {
    useAuthStore.getState().setPartner(partner)
    useAuthStore.getState().clear()
    expect(useAuthStore.getState().partner).toBeNull()
  })
})

describe('partnerDestination', () => {
  it('keeps in-app partner pages and rejects everything else', () => {
    expect(partnerDestination({ pathname: '/partner/documents', search: '?a=1' })).toBe(
      '/partner/documents?a=1',
    )
    for (const p of ['/admin/users', '/partner/login', 'https://evil.test', '//evil.test', ''])
      expect(partnerDestination({ pathname: p })).toBe('/partner/dashboard')
  })
})

describe('partnerAuthService.loadSession', () => {
  it('maps a partner account from /auth/me', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(me({}))
    await expect(partnerAuthService.loadSession()).resolves.toMatchObject({
      organizationId: 'o1',
      organizationName: 'Acme Ltd',
    })
    expect(useAuthStore.getState().partner).not.toBeNull()
  })
  it('rejects staff accounts and signs out', async () => {
    useAuthStore.getState().setTokens('a', 'r')
    vi.spyOn(api, 'get').mockResolvedValue(me({ user_type: 'staff', organization: null }))
    vi.spyOn(api, 'post').mockResolvedValue({})
    await expect(partnerAuthService.loadSession()).rejects.toThrow(/Partner Portal/)
    expect(useAuthStore.getState().partner).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
  it('rejects a partner without an organization', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(me({ organization: null }))
    vi.spyOn(api, 'post').mockResolvedValue({})
    await expect(partnerAuthService.loadSession()).rejects.toThrow()
  })
})

describe('partner login page', () => {
  const fill = (email: string, password: string) => {
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
    fireEvent.change(screen.getByLabelText(/^Password$/), { target: { value: password } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  }
  it('validates required fields without calling the API', async () => {
    const post = vi.spyOn(api, 'post')
    render(app('/partner/login'))
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })
  it('signs in and lands on the dashboard', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(
      envelope({ access_token: 'a', refresh_token: 'r', mfa_required: false }),
    )
    vi.spyOn(api, 'get').mockResolvedValue(me({}))
    render(app('/partner/login'))
    fill('pat@example.com', 'pw')
    expect(await screen.findByText('partner area')).toBeInTheDocument()
  })
  it('shows the backend message on invalid credentials', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 401, data: { message: 'Invalid credentials' } },
      }),
    )
    render(app('/partner/login'))
    fill('pat@example.com', 'bad')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
    expect(useAuthStore.getState().partner).toBeNull()
  })
  it('shows a network error when the backend is unreachable', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(
      Object.assign(new Error('Network Error'), { isAxiosError: true }),
    )
    render(app('/partner/login'))
    fill('pat@example.com', 'pw')
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Cannot reach/))
  })
  it('refuses a staff login on the partner page', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(envelope({ access_token: 'a', refresh_token: 'r' }))
    vi.spyOn(api, 'get').mockResolvedValue(me({ user_type: 'staff', organization: null }))
    render(app('/partner/login'))
    fill('sam@example.com', 'pw')
    expect(await screen.findByRole('alert')).toHaveTextContent(/does not have access/)
    expect(useAuthStore.getState().partner).toBeNull()
  })
})
