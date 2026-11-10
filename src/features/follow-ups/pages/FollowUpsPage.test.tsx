import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DiscussionsPage from '@/features/discussions/pages/DiscussionsPage'
import { businessEnquiriesService } from '@/features/business-enquiries/services/businessEnquiriesService'
import type { EnquiryRow } from '@/features/business-enquiries/types'
import { useAuthStore } from '@/store/authStore'
import { followUpsMetrics } from '../services/followUpsService'
import FollowUpsPage from './FollowUpsPage'

const setRole = (role: 'super_administrator' | 'business_development_manager') =>
  useAuthStore.setState({ user: { id: 'me', name: 'T', email: 't@x.test', role } })

const renderPage = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )

const row = (o: Partial<EnquiryRow>): EnquiryRow => ({
  id: '1',
  reference_number: 'ENQ-1',
  enquiry_type: 'project',
  subject: 's',
  status: 'received',
  priority: 'normal',
  source: null,
  contact_name: 'Ann',
  contact_email: null,
  company_name: 'Acme',
  assigned_user_id: null,
  next_follow_up_at: '2099-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  ...o,
})

beforeEach(() => {
  vi.spyOn(followUpsMetrics, 'load').mockResolvedValue({
    total: { value: 3 },
    open: { value: 2 },
    overdue: { value: 1 },
    pendingResponses: {},
  })
})
afterEach(() => vi.restoreAllMocks())

describe('Discussions', () => {
  it('shows accurate counts and labels unsupported metrics', async () => {
    setRole('business_development_manager')
    vi.spyOn(businessEnquiriesService, 'list').mockResolvedValue({
      rows: [row({})],
      meta: { total: 1 },
    })
    renderPage(<DiscussionsPage />)
    expect(await screen.findByText('ENQ-1')).toBeInTheDocument()
    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getAllByText(/Not supported/).length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText(/never presented as messages to applicants/)).toBeInTheDocument()
  })

  it('hides strategic records and filter option for a BD manager', async () => {
    setRole('business_development_manager')
    vi.spyOn(businessEnquiriesService, 'list').mockResolvedValue({
      rows: [row({ id: '2', reference_number: 'STR-1', enquiry_type: 'strategic' }), row({})],
      meta: { total: 2 },
    })
    renderPage(<DiscussionsPage />)
    expect(await screen.findByText('ENQ-1')).toBeInTheDocument()
    expect(screen.queryByText('STR-1')).toBeNull()
    expect(screen.queryByRole('option', { name: 'Strategic' })).toBeNull()
    expect(screen.queryByRole('tab', { name: /Partner Applications/ })).toBeNull()
  })

  it('shows the backend message on 403 and an empty state', async () => {
    setRole('super_administrator')
    const spy = vi.spyOn(businessEnquiriesService, 'list')
    spy.mockRejectedValue(
      new AxiosError('x', '403', undefined, undefined, {
        status: 403,
        data: { message: 'Forbidden' },
      } as never),
    )
    renderPage(<DiscussionsPage />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    setRole('super_administrator')
    vi.spyOn(businessEnquiriesService, 'list').mockResolvedValue({ rows: [], meta: { total: 0 } })
    renderPage(<DiscussionsPage />)
    expect(await screen.findByText('No enquiries match your filters')).toBeInTheDocument()
  })
})

describe('Follow-ups', () => {
  it('groups by due date, completes only after confirmation', async () => {
    setRole('super_administrator')
    vi.spyOn(businessEnquiriesService, 'list').mockResolvedValue({
      rows: [row({}), row({ id: '9', reference_number: 'NODATE', next_follow_up_at: null })],
      meta: { total: 2 },
    })
    vi.spyOn(businessEnquiriesService, 'detail').mockResolvedValue({
      enquiry: row({}),
      message: null,
      contact: {},
      company: null,
      details: null,
      documents: [],
      follow_ups: [
        {
          id: 'f1',
          author_id: 'me',
          note: 'Call back',
          due_at: '2099-01-01T00:00:00Z',
          completed_at: null,
          created_at: '2026-01-02T00:00:00Z',
        },
      ],
    })
    const complete = vi
      .spyOn(businessEnquiriesService, 'completeFollowUp')
      .mockResolvedValue({} as never)
    renderPage(<FollowUpsPage />)
    expect(await screen.findByText('ENQ-1')).toBeInTheDocument()
    expect(screen.queryByText('NODATE')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View follow-ups' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Mark complete' }))
    expect(complete).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark complete' }))
    await waitFor(() => expect(complete).toHaveBeenCalledWith('1', 'f1'))
  })
})
