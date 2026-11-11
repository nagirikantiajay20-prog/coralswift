import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute } from '@/features/auth/components/guards'
import { PARTNER_NAVIGATION } from '../config/navigation'
import { pathwayLabel } from '../utils/engagement'
import PartnerProjectsPage from './PartnerProjectsPage'

// Test doubles only; the page never ships sample data.
const partner = {
  id: 'p1',
  name: 'Pat',
  email: 'p@x.test',
  organizationId: 'o1',
  organizationName: 'Acme',
}
const app = (pathway: string) => ({ id: 'a1', reference: 'APP-1', pathway })
const mockApps = (v: unknown) =>
  vi.spyOn(api, 'get').mockImplementation(async () => {
    if (v instanceof Error) throw v
    return { data: { success: true, data: v } } as never
  })
const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/partner/projects']}>
        <Routes>
          <Route path="/login" element={<p>partner login</p>} />
          <Route element={<ProtectedRoute kind="partner" />}>
            <Route path="/partner/projects" element={<PartnerProjectsPage />} />
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

describe('PartnerProjectsPage', () => {
  it('redirects unauthenticated visitors with no API calls', () => {
    useAuthStore.getState().clear()
    const spy = mockApps([])
    renderPage()
    expect(screen.getByText('partner login')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('says project visibility is unavailable and never implies an assignment', async () => {
    mockApps([app('direct_project_engagement')])
    renderPage()
    expect(screen.getByText('Project visibility is not yet available')).toBeInTheDocument()
    expect(await screen.findByText('Direct project engagement')).toBeInTheDocument()
    expect(screen.getByText(/not a project or contract/)).toBeInTheDocument()
  })

  it('only calls the verified applications endpoint, with no partner/org id', async () => {
    const spy = mockApps([app('vendor_subcontracting')])
    renderPage()
    await screen.findByText('Vendor / subcontracting partnership')
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['/api/v1/partner/applications'])
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(/o1|p1|organization/)
  })

  it('shows empty and error states', async () => {
    mockApps([])
    const { unmount } = renderPage()
    expect(await screen.findByText('No application on record.')).toBeInTheDocument()
    unmount()
    vi.restoreAllMocks()
    mockApps(new Error('boom'))
    renderPage()
    expect(await screen.findByRole('button', { name: /retry|try again/i })).toBeInTheDocument()
  })
})

describe('engagement pathway labels', () => {
  it('maps the backend enum; strategic shows a name only', () => {
    expect(pathwayLabel('strategic_merger_integration')).toBe('Strategic partnership discussion')
    expect(pathwayLabel('something_new')).toBe('Something new')
    expect(pathwayLabel(undefined)).toBeUndefined()
  })
  it('hides Projects from nav (PRD s.23)', () => {
    expect(PARTNER_NAVIGATION.some((n) => n.to === '/partner/projects')).toBe(false)
  })
})
