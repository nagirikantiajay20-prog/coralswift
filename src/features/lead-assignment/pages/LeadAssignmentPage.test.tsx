import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import { leadAssignmentService } from '../services/leadAssignmentService'
import LeadAssignmentPage from './LeadAssignmentPage'

const forbidden = () =>
  new AxiosError('x', '403', undefined, undefined, {
    status: 403,
    data: { message: 'Forbidden' },
  } as never)

const setRole = (role: 'super_administrator' | 'business_development_manager') =>
  useAuthStore.setState({ user: { id: 'me', name: 'T', email: 't@x.test', role } })

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <LeadAssignmentPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const record = {
  key: 'general:1',
  category: 'general' as const,
  id: '1',
  reference: 'ENQ-9',
  title: 's',
  organization: 'Acme',
  contactName: 'Ann',
  contactEmail: null,
  status: 'received',
  priority: 'high',
  assigneeId: null,
  followUpAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  pending: true,
  overdue: false,
}

beforeEach(() => {
  vi.spyOn(leadAssignmentService, 'counts').mockResolvedValue({ total: 5, unassigned: 2 })
  vi.spyOn(leadAssignmentService, 'staffNames').mockResolvedValue(new Map())
})
afterEach(() => vi.restoreAllMocks())

describe('LeadAssignmentPage', () => {
  it('BD manager sees only enquiry categories, never strategic or applications', async () => {
    setRole('business_development_manager')
    vi.spyOn(leadAssignmentService, 'list').mockResolvedValue({
      records: [record],
      meta: { total: 1 },
    })
    renderPage()
    expect(await screen.findByRole('tab', { name: 'Business Enquiries' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Strategic/ })).toBeNull()
    expect(screen.queryByRole('tab', { name: /Partner Applications/ })).toBeNull()
    expect(await screen.findByText('ENQ-9')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assign ENQ-9' })).toBeInTheDocument()
  })

  it('super administrator sees all four categories', async () => {
    setRole('super_administrator')
    vi.spyOn(leadAssignmentService, 'list').mockResolvedValue({ records: [], meta: { total: 0 } })
    renderPage()
    expect(await screen.findAllByRole('tab')).toHaveLength(4)
    expect(await screen.findByText(/No partner applications match/i)).toBeInTheDocument()
  })

  it('shows an access-denied state on backend 403', async () => {
    setRole('super_administrator')
    vi.spyOn(leadAssignmentService, 'list').mockRejectedValue(forbidden())
    renderPage()
    await waitFor(() => expect(screen.getAllByText('Access denied').length).toBeGreaterThan(0))
  })

  it('shows an error with retry on other failures and a loading state first', async () => {
    setRole('business_development_manager')
    vi.spyOn(leadAssignmentService, 'list').mockRejectedValue(new Error('boom'))
    renderPage()
    expect(screen.getByRole('status', { name: /Loading business enquiries/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('marks metrics unavailable when the backend returns no total', async () => {
    setRole('business_development_manager')
    vi.mocked(leadAssignmentService.counts).mockResolvedValue({})
    vi.spyOn(leadAssignmentService, 'list').mockResolvedValue({ records: [], meta: null })
    renderPage()
    expect(await screen.findByText(/Summary totals exclude/)).toBeInTheDocument()
  })
})
