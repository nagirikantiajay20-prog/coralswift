import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import PartnerEnquiriesPage from './PartnerEnquiriesPage'

// Test doubles only; the page never ships sample data.
const row = (ref: string, status: string, at: string) => ({
  reference_number: ref,
  enquiry_type: 'partner',
  status,
  submitted_at: at,
})
const mock = (data: unknown) =>
  vi.spyOn(api, 'get').mockImplementation(async () => {
    if (data instanceof Error) throw data
    return { data: { success: true, data } } as never
  })
const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <PartnerEnquiriesPage />
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
  vi.restoreAllMocks()
  useAuthStore.getState().clear()
})

describe('PartnerEnquiriesPage', () => {
  it('lists enquiries from the backend and filters by search and status', async () => {
    const get = mock([
      row('ENQ-1', 'new', '2026-11-01T00:00:00Z'),
      row('ENQ-2', 'closed', '2026-11-02T00:00:00Z'),
    ])
    renderPage()
    expect(await screen.findByText('ENQ-1')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/api/v1/partner/enquiries', expect.anything())
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'closed' } })
    expect(screen.queryByText('ENQ-1')).not.toBeInTheDocument()
    expect(screen.getByText('ENQ-2')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Search enquiries'), { target: { value: 'nomatch' } })
    expect(screen.getByText('No matching enquiries')).toBeInTheDocument()
  })

  it('paginates newest-first and does not mislabel the page as complete when empty', async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      row(`ENQ-${String(i + 1).padStart(2, '0')}`, 'new', `2026-11-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
    )
    mock(many)
    renderPage()
    expect(await screen.findByText('ENQ-12')).toBeInTheDocument()
    expect(screen.queryByText('ENQ-01')).not.toBeInTheDocument() // page 1 holds the 10 newest
    expect(screen.getByText('ENQ-03')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText('ENQ-01')).toBeInTheDocument()
    expect(screen.queryByText('ENQ-12')).not.toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    mock([])
    renderPage()
    expect(await screen.findByText('No enquiries')).toBeInTheDocument()
  })

  it('shows an error with retry', async () => {
    mock(new Error('boom'))
    renderPage()
    expect(await screen.findByRole('button', { name: /retry/i }, { timeout: 4000 })).toBeInTheDocument()
  })
})
