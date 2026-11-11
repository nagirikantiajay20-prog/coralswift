import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute, HomeRedirect } from '@/features/auth/components/guards'
import LoginPage from '@/features/auth/pages/LoginPage'
import { authService } from '@/features/auth/services/authService'
import { resolveDestination } from '@/features/auth/utils/destination'
import { partnerAuthService } from '@/partner/services/partnerAuthService'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'

// Mocked-API tests only (no live backend): they prove the frontend routing/session logic.
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
const partnerMe = (o: object = {}) =>
  envelope({
    id: 'p1',
    email: 'pat@example.com',
    full_name: 'Pat',
    user_type: 'partner',
    staff_role: null,
    organization: { id: 'o1', legal_name: 'Acme Ltd' },
    ...o,
  })
const staffMe = (staff_role: string | null) =>
  envelope({
    id: 's1',
    email: 'sam@example.com',
    full_name: 'Sam',
    user_type: 'staff',
    staff_role,
    organization: null,
  })

const app = (path: string | { pathname: string; state?: unknown }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
  >
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/session-expired" element={<p>session expired page</p>} />
        <Route element={<ProtectedRoute kind="partner" />}>
          <Route path="/partner/dashboard" element={<p>partner area</p>} />
          <Route path="/partner/documents" element={<p>partner documents</p>} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<p>admin area</p>} />
          <Route path="/admin/users" element={<p>admin users</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>
)

beforeEach(() => useAuthStore.getState().clear())
afterEach(() => vi.restoreAllMocks())

describe('route guards', () => {
  it('sends a visitor with no session to the single login, for both portals', () => {
    const { unmount } = render(app('/partner/dashboard'))
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    unmount()
    render(app('/admin/dashboard'))
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
  it('admits each session only to its own portal', () => {
    useAuthStore.getState().setPartner(partner)
    render(app('/partner/dashboard'))
    expect(screen.getByText('partner area')).toBeInTheDocument()
  })
  it('a staff session on a partner URL lands on the admin dashboard (no promotion, no loop)', () => {
    useAuthStore.getState().setUser(staff)
    render(app('/partner/dashboard'))
    expect(screen.getByText('admin area')).toBeInTheDocument()
  })
  it('a partner session on an admin URL lands on the partner dashboard', () => {
    useAuthStore.getState().setPartner(partner)
    render(app('/admin/users'))
    expect(screen.getByText('partner area')).toBeInTheDocument()
    expect(screen.queryByText('admin users')).toBeNull()
  })
  it('session expiry shows the expired page, then clears the session', () => {
    useAuthStore.getState().setPartner(partner)
    useAuthStore.getState().expire()
    expect(useAuthStore.getState().partner).toBeNull()
    render(app('/partner/dashboard'))
    expect(screen.getByText('session expired page')).toBeInTheDocument()
  })
  it('"/" goes to the session home, or login when signed out', () => {
    const { unmount } = render(app('/'))
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    unmount()
    useAuthStore.getState().setUser(staff)
    render(app('/'))
    expect(screen.getByText('admin area')).toBeInTheDocument()
  })
  it('an already signed-in user opening /login is sent to their portal', () => {
    useAuthStore.getState().setPartner(partner)
    render(app('/login'))
    expect(screen.getByText('partner area')).toBeInTheDocument()
  })
})

describe('resolveDestination', () => {
  it('keeps in-portal deep links and rejects everything else', () => {
    expect(resolveDestination('partner', { pathname: '/partner/documents', search: '?a=1' })).toBe(
      '/partner/documents?a=1',
    )
    expect(resolveDestination('staff', { pathname: '/admin/users' })).toBe('/admin/users')
    for (const p of [
      '/admin/users',
      '/login',
      '/partner/login',
      'https://evil.test',
      '//evil.test',
      '',
    ])
      expect(resolveDestination('partner', { pathname: p })).toBe('/partner/dashboard')
    for (const p of [
      '/partner/documents',
      '/login',
      '/admin',
      '//admin/x',
      'https://evil.test',
      '',
    ])
      expect(resolveDestination('staff', { pathname: p })).toBe('/admin/dashboard')
  })
})

describe('authService.completeSession (backend identity decides the portal)', () => {
  it('maps a partner account', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(partnerMe())
    await expect(authService.completeSession()).resolves.toBe('partner')
    expect(useAuthStore.getState().partner?.organizationId).toBe('o1')
  })
  it.each([
    'super_administrator',
    'business_development_manager',
    'partner_reviewer',
    'content_administrator',
  ])('maps staff role %s to the staff session', async (role) => {
    vi.spyOn(api, 'get').mockImplementation((url: string) =>
      Promise.resolve(url.includes('permissions') ? envelope(null) : staffMe(role)),
    )
    await expect(authService.completeSession()).resolves.toBe('staff')
    expect(useAuthStore.getState().user).not.toBeNull()
  })
  it('signs out an unknown staff role instead of guessing', async () => {
    useAuthStore.getState().setTokens('a', 'r')
    vi.spyOn(api, 'get').mockResolvedValue(staffMe('mystery_role'))
    vi.spyOn(api, 'post').mockResolvedValue({})
    await expect(authService.completeSession()).rejects.toThrow(/does not have access/)
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
  it('rejects a partner without an organization', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(partnerMe({ organization: null }))
    vi.spyOn(api, 'post').mockResolvedValue({})
    await expect(partnerAuthService.loadSession()).rejects.toThrow()
  })
})

describe('login page', () => {
  const fill = (email: string, password: string) => {
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
    fireEvent.change(screen.getByLabelText(/^Password$/), { target: { value: password } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  }
  const tokens = envelope({ access_token: 'a', refresh_token: 'r', mfa_required: false })

  it('has no portal/role selector', () => {
    render(app('/login'))
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('radio')).toBeNull()
  })
  it('validates required fields without calling the API', async () => {
    const post = vi.spyOn(api, 'post')
    render(app('/login'))
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })
  it('toggles password visibility', () => {
    render(app('/login'))
    const pw = screen.getByLabelText(/^Password$/)
    expect(pw).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(pw).toHaveAttribute('type', 'text')
  })
  it('a partner account lands on the partner dashboard', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(tokens)
    vi.spyOn(api, 'get').mockResolvedValue(partnerMe())
    render(app('/login'))
    fill('pat@example.com', 'pw')
    expect(await screen.findByText('partner area')).toBeInTheDocument()
  })
  it('a staff account lands on the admin dashboard', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(tokens)
    vi.spyOn(api, 'get').mockImplementation((url: string) =>
      Promise.resolve(url.includes('permissions') ? envelope(null) : staffMe('partner_reviewer')),
    )
    render(app('/login'))
    fill('sam@example.com', 'pw')
    expect(await screen.findByText('admin area')).toBeInTheDocument()
  })
  it('returns to the remembered deep link after login', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(tokens)
    vi.spyOn(api, 'get').mockResolvedValue(partnerMe())
    render(app({ pathname: '/login', state: { from: { pathname: '/partner/documents' } } }))
    fill('pat@example.com', 'pw')
    expect(await screen.findByText('partner documents')).toBeInTheDocument()
  })
  it('ignores a deep link into the other portal', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(tokens)
    vi.spyOn(api, 'get').mockResolvedValue(partnerMe())
    render(app({ pathname: '/login', state: { from: { pathname: '/admin/users' } } }))
    fill('pat@example.com', 'pw')
    expect(await screen.findByText('partner area')).toBeInTheDocument()
  })
  it('shows the backend message on invalid credentials and keeps no session', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 401, data: { message: 'Invalid credentials' } },
      }),
    )
    render(app('/login'))
    fill('pat@example.com', 'bad')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
    expect(useAuthStore.getState().partner).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })
  it('shows a network error when the backend is unreachable', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(
      Object.assign(new Error('Network Error'), { isAxiosError: true }),
    )
    render(app('/login'))
    fill('pat@example.com', 'pw')
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Cannot reach/))
  })
  it('asks for the second factor before any session exists', async () => {
    vi.spyOn(api, 'post').mockResolvedValue(
      envelope({ access_token: 'a', refresh_token: 'r', mfa_required: true }),
    )
    const get = vi.spyOn(api, 'get')
    render(app('/login'))
    fill('pat@example.com', 'pw')
    expect(await screen.findByText('Two-step verification')).toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
  })
})
