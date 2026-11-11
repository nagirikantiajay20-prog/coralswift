import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute } from '@/features/auth/components/guards'
import PartnerDashboardPage from './PartnerDashboardPage'

// Test doubles only; the page never ships sample data.
const partner = {
  id: 'p1',
  name: 'Pat',
  email: 'p@x.test',
  organizationId: 'o1',
  organizationName: 'Acme Ltd',
}
const ok = (data: unknown) => ({ data: { success: true, data } })
const APP = {
  id: 'a1',
  reference: 'APP-1',
  status: 'information_requested',
  status_label: 'Information requested',
  submission_count: 1,
  submitted_at: '2026-11-01T00:00:00Z',
  open_information_requests: 2,
}
const routes: Record<string, unknown> = {
  '/api/v1/partner/applications': [APP],
  '/api/v1/partner/organization/completion': {
    percent: 60,
    missing_fields: ['registered_address'],
    complete: false,
  },
  '/api/v1/partner/documents': [
    {
      id: 'd1',
      category: 'registration_proof',
      status: 'active',
      current_version: {
        version_no: 1,
        review_status: 'pending',
        expires_on: null,
        uploaded_at: '2026-11-02T00:00:00Z',
      },
    },
  ],
  '/api/v1/partner/notifications': [
    { type: 'application_received', status: 'sent', created_at: '2026-11-03T00:00:00Z' },
  ],
  '/api/v1/partner/enquiries': [
    { reference_number: 'ENQ-9', status: 'received', created_at: '2026-10-01T00:00:00Z' },
  ],
  '/api/v1/partner/applications/a1/history': [
    {
      to_status: 'submitted',
      to_label: 'Submitted',
      note: null,
      created_at: '2026-11-01T00:00:00Z',
    },
  ],
  '/api/v1/partner/applications/a1/messages': [
    {
      id: 'm1',
      kind: 'information_request',
      status: 'open',
      from_reviewer: true,
      body: 'Please add proof',
      requested_categories: null,
      created_at: '2026-11-04T00:00:00Z',
    },
  ],
}
const mockApi = (override: Record<string, unknown> = {}) =>
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    const v = { ...routes, ...override }[url]
    if (v instanceof Error) throw v
    return ok(v) as never
  })

const renderAt = (path = '/partner/dashboard') =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>partner login</p>} />
          <Route element={<ProtectedRoute kind="partner" />}>
            <Route path="/partner/dashboard" element={<PartnerDashboardPage />} />
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

describe('PartnerDashboardPage', () => {
  it('redirects unauthenticated visitors and makes no API calls', () => {
    useAuthStore.getState().clear()
    const spy = mockApi()
    renderAt()
    expect(screen.getByText('partner login')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('renders backend data for every section', async () => {
    mockApi()
    renderAt()
    expect(screen.getByRole('heading', { name: /Welcome, Pat/ })).toBeInTheDocument()
    expect(await screen.findByText('60% complete')).toBeInTheDocument()
    expect(screen.getByText('Registered address')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Profile completion' })).toHaveAttribute(
      'aria-valuenow',
      '60',
    )
    expect((await screen.findAllByText('Information requested')).length).toBeGreaterThan(0)
    expect(screen.getByText('APP-1')).toBeInTheDocument()
    expect(screen.getByText('Registration proof')).toBeInTheDocument()
    expect(screen.getByText('Application received')).toBeInTheDocument()
    expect(screen.getByText('ENQ-9')).toBeInTheDocument()
    expect(await screen.findByText('Please add proof')).toBeInTheDocument()
    expect(screen.getByText('Status: Submitted')).toBeInTheDocument()
  })

  it('never sends an organization or partner id', async () => {
    const spy = mockApi()
    renderAt()
    await screen.findByText('60% complete')
    for (const [url, cfg] of spy.mock.calls as [string, { params?: object }?][]) {
      expect(url).not.toMatch(/o1|p1|organization_id/)
      expect(JSON.stringify(cfg?.params ?? {})).not.toMatch(/o1|p1|organization/)
    }
  })

  it('shows empty states', async () => {
    mockApi({
      '/api/v1/partner/applications': [],
      '/api/v1/partner/documents': [],
      '/api/v1/partner/notifications': [],
      '/api/v1/partner/enquiries': [],
      '/api/v1/partner/organization/completion': {
        percent: 100,
        missing_fields: [],
        complete: true,
      },
    })
    renderAt()
    expect(await screen.findByText('No application on record')).toBeInTheDocument()
    expect(screen.getByText('No documents on file')).toBeInTheDocument()
    expect(screen.getByText('No notifications')).toBeInTheDocument()
    expect(screen.getByText('No enquiries')).toBeInTheDocument()
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
    expect(screen.getByText('No incomplete sections reported.')).toBeInTheDocument()
  })

  it('isolates a partial failure and retries only that section', async () => {
    const spy = mockApi({ '/api/v1/partner/enquiries': new Error('boom') })
    renderAt()
    const section = (await screen.findByRole('heading', { name: 'Enquiry history' })).closest(
      'div.rounded-lg',
    ) as HTMLElement
    await waitFor(() => expect(within(section).getByRole('alert')).toBeInTheDocument(), {
      timeout: 5000,
    })
    expect(await screen.findByText('60% complete')).toBeInTheDocument()
    expect(screen.getByText('APP-1')).toBeInTheDocument()
    const before = spy.mock.calls.filter((c) => c[0].endsWith('/enquiries')).length
    spy.mockImplementation(
      async (url: string) =>
        ok(url.endsWith('/enquiries') ? routes['/api/v1/partner/enquiries'] : routes[url]) as never,
    )
    within(section).getByRole('button', { name: 'Retry' }).click()
    expect(await screen.findByText('ENQ-9')).toBeInTheDocument()
    expect(spy.mock.calls.filter((c) => c[0].endsWith('/enquiries')).length).toBe(before + 1)
  })

  it('shows access-denied text on 403', async () => {
    const e = Object.assign(new Error('x'), {
      isAxiosError: true,
      response: { status: 403, data: {} },
    })
    mockApi({ '/api/v1/partner/documents': e })
    renderAt()
    expect(
      (
        await screen.findAllByText(
          'You do not have access to this information.',
          {},
          { timeout: 5000 },
        )
      ).length,
    ).toBeGreaterThan(0)
  })
})
