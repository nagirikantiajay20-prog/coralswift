import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { businessEnquiriesService } from '@/features/business-enquiries/services/businessEnquiriesService'
import { useAuthStore } from '@/store/authStore'
import ReportsPage from './ReportsPage'

const show = (role: 'super_administrator' | 'business_development_manager', path: string) => {
  useAuthStore.setState({ user: { id: 'me', name: 'T', email: 't@x.test', role } })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/reports/:section" element={<ReportsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
afterEach(() => vi.restoreAllMocks())

describe('ReportsPage', () => {
  it('hides Strategic / M&A and never queries it for a role without access', async () => {
    const list = vi
      .spyOn(businessEnquiriesService, 'list')
      .mockResolvedValue({ rows: [], meta: { total: 7 } })
    show('business_development_manager', '/admin/reports/strategic')
    expect(screen.getByText('Permission denied')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Strategic / M&A' })).toBeNull()
    expect(list).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'strategic' }))
  })

  it('general enquiry reports exclude strategic and total exact backend counts', async () => {
    const list = vi
      .spyOn(businessEnquiriesService, 'list')
      .mockResolvedValue({ rows: [], meta: { total: 2 } })
    show('super_administrator', '/admin/reports/enquiries')
    await waitFor(() => expect(screen.getAllByText('8').length).toBeGreaterThan(0)) // 4 types x 2
    expect(list).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'strategic' }))
  })

  it('shows a metric as unavailable, not zero, when the backend gives no total', async () => {
    vi.spyOn(businessEnquiriesService, 'list').mockResolvedValue({ rows: [], meta: null })
    show('super_administrator', '/admin/reports/enquiries')
    await waitFor(() => expect(screen.getAllByText('Failed to load').length).toBeGreaterThan(0))
  })
})
