import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { PartnerRoute } from '../components/PartnerRoute'
import { PARTNER_NAVIGATION } from '../config/navigation'
import PartnerPerformancePage from './PartnerPerformancePage'

// Test doubles only; the page never ships sample data.
const partner = {
  id: 'p1',
  name: 'Pat',
  email: 'p@x.test',
  organizationId: 'o1',
  organizationName: 'Acme',
}
const app = {
  id: 'a1',
  reference: 'APP-1',
  status_label: 'Under review',
  pathway: 'vendor_subcontracting',
  submitted_at: null,
}
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
      <MemoryRouter initialEntries={['/partner/performance']}>
        <Routes>
          <Route path="/partner/login" element={<p>partner login</p>} />
          <Route element={<PartnerRoute />}>
            <Route path="/partner/performance" element={<PartnerPerformancePage />} />
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

describe('PartnerPerformancePage', () => {
  it('redirects unauthenticated visitors with no API calls', () => {
    useAuthStore.getState().clear()
    const spy = mockApps([])
    renderPage()
    expect(screen.getByText('partner login')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('states performance reporting is unavailable and shows no scores', async () => {
    mockApps([app])
    renderPage()
    expect(screen.getByText('Performance reporting is not yet available')).toBeInTheDocument()
    expect(await screen.findByText('APP-1')).toBeInTheDocument()
    expect(screen.getByText('Under review')).toBeInTheDocument()
    expect(screen.queryByText(/%/)).toBeNull()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('only calls the verified applications endpoint, with no partner/org id', async () => {
    const spy = mockApps([app])
    renderPage()
    await screen.findByText('APP-1')
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

  it('hides Performance from nav (Phase 4)', () => {
    expect(PARTNER_NAVIGATION.some((n) => n.to === '/partner/performance')).toBe(false)
  })
})
