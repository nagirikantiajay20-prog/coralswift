import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute } from '@/features/auth/components/guards'
import { PARTNER_NAVIGATION } from '../config/navigation'
import PartnerFollowUpsPage from './PartnerFollowUpsPage'
import PartnerMeetingsPage from './PartnerMeetingsPage'

// Test doubles only; pages never ship sample data.
const partner = {
  id: 'p1',
  name: 'Pat',
  email: 'p@x.test',
  organizationId: 'o1',
  organizationName: 'Acme',
}
const msg = {
  id: 'm1',
  kind: 'information_request',
  status: 'open',
  from_reviewer: true,
  body: 'Send your licence',
  requested_categories: [],
  in_reply_to: null,
  created_at: '2026-01-01T00:00:00Z',
}
const mock = (messages: unknown) =>
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (messages instanceof Error) throw messages
    const data = url.endsWith('/messages')
      ? messages
      : [{ id: 'a1', reference: 'APP-1', submitted_at: null }]
    return { data: { success: true, data } } as never
  })
const renderAt = (path: string) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>partner login</p>} />
          <Route element={<ProtectedRoute kind="partner" />}>
            <Route path="/partner/follow-ups" element={<PartnerFollowUpsPage />} />
            <Route path="/partner/meetings" element={<PartnerMeetingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => useAuthStore.getState().setPartner(partner))
afterEach(() => {
  vi.restoreAllMocks()
  useAuthStore.getState().clear()
})

describe('Phase 32 partner pages', () => {
  it('meetings: honest unavailable state, no API calls', () => {
    const spy = mock([])
    renderAt('/partner/meetings')
    expect(screen.getByText('Meeting visibility is not yet available')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })
  it('follow-ups: lists open information requests from the messages endpoint only', async () => {
    const spy = mock([msg])
    renderAt('/partner/follow-ups')
    expect(await screen.findByText('Send your licence')).toBeInTheDocument()
    const urls = spy.mock.calls.map((c) => c[0])
    expect(urls).toContain('/api/v1/partner/applications/a1/messages')
    expect(urls.every((u) => u.startsWith('/api/v1/partner/applications'))).toBe(true)
  })
  it('follow-ups: empty and error states', async () => {
    mock([])
    const { unmount } = renderAt('/partner/follow-ups')
    expect(await screen.findByText('Nothing needs your response.')).toBeInTheDocument()
    unmount()
    vi.restoreAllMocks()
    mock(new Error('boom'))
    renderAt('/partner/follow-ups')
    expect(
      await screen.findByRole('button', { name: /retry|try again/i }, { timeout: 5000 }),
    ).toBeInTheDocument()
  })
  it('redirects unauthenticated visitors', () => {
    useAuthStore.getState().clear()
    renderAt('/partner/follow-ups')
    expect(screen.getByText('partner login')).toBeInTheDocument()
  })
  it('hides Meetings, keeps Follow-ups in nav', () => {
    const to = PARTNER_NAVIGATION.map((n) => n.to)
    expect(to).toContain('/partner/follow-ups')
    expect(to).not.toContain('/partner/meetings')
  })
})
