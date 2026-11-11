import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import { dashboardService } from '../services/dashboardService'
import DashboardPage from './DashboardPage'

// Test doubles only: asserts the page maps API rows to cards and surfaces errors per card.
vi.mock('recharts', async (orig) => ({
  ...(await orig<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

beforeAll(() => {
  useAuthStore.setState({
    user: { id: '1', name: 'T', email: 't@x.test', role: 'super_administrator' },
  })
})

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe('DashboardPage', () => {
  it('shows backend values and a per-card error', async () => {
    vi.spyOn(dashboardService, 'overview').mockResolvedValue({ open_leads: 7 })
    vi.spyOn(dashboardService, 'kpis').mockRejectedValue(new Error('boom'))
    vi.spyOn(dashboardService, 'activeOrganizations').mockResolvedValue({ partial: false, rows: [
      { id: 'o' },
      { id: 'p' },
    ] } as never)
    vi.spyOn(dashboardService, 'enquiries').mockResolvedValue({ partial: false, rows: [
      {
        id: 'e1',
        reference_number: 'ENQ-1',
        enquiry_type: 'general',
        status: 'received',
        next_follow_up_at: '2026-12-01T00:00:00Z',
        created_at: '2026-11-01T00:00:00Z',
        company_name: 'Acme',
      },
      {
        id: 'e2',
        reference_number: 'ENQ-2',
        enquiry_type: 'project',
        status: 'closed',
        next_follow_up_at: null,
        created_at: '2026-11-02T00:00:00Z',
        company_name: null,
      },
    ] } as never)
    vi.spyOn(dashboardService, 'applications').mockResolvedValue({ partial: false, rows: [
      {
        id: 'a1',
        reference: 'APP-1',
        status: 'submitted',
        submitted_at: '2026-11-03T00:00:00Z',
        organization_name: 'Org',
      },
      {
        id: 'a2',
        reference: 'APP-2',
        status: 'rejected',
        submitted_at: '2026-11-04T00:00:00Z',
        organization_name: 'Org2',
      },
    ] } as never)
    renderPage()
    const val = (label: string) =>
      screen
        .findByText(label)
        .then((l) => l.parentElement!.querySelector('p.font-heading')?.textContent)
    await waitFor(async () => expect(await val('Active partners')).toBe('2'))
    expect(await val('Total partner applications')).toBe('2')
    expect(await val('Rejected applications')).toBe('1')
    expect(await val('Open enquiries')).toBe('1')
    expect(await val('Pending follow-ups')).toBe('1')
    expect(await screen.findByText('open leads')).toBeTruthy()
    expect(await screen.findByRole('alert')).toBeTruthy() // KPI error isolated to its card
  })

  it('says so when a list hit the safety ceiling instead of presenting it as complete', async () => {
    vi.spyOn(dashboardService, 'overview').mockResolvedValue({})
    vi.spyOn(dashboardService, 'kpis').mockResolvedValue({})
    vi.spyOn(dashboardService, 'activeOrganizations').mockResolvedValue({
      rows: [],
      partial: false,
    } as never)
    vi.spyOn(dashboardService, 'enquiries').mockResolvedValue({ rows: [], partial: true } as never)
    vi.spyOn(dashboardService, 'applications').mockResolvedValue({
      rows: [],
      partial: false,
    } as never)
    renderPage()
    const note = await screen.findByRole('note')
    expect(note).toHaveTextContent(/enquiries are incomplete/)
    expect(note).not.toHaveTextContent(/applications|partners/)
  })

  it('shows no incompleteness note for complete data', async () => {
    vi.spyOn(dashboardService, 'overview').mockResolvedValue({})
    vi.spyOn(dashboardService, 'kpis').mockResolvedValue({})
    const done = { rows: [], partial: false } as never
    vi.spyOn(dashboardService, 'activeOrganizations').mockResolvedValue(done)
    vi.spyOn(dashboardService, 'enquiries').mockResolvedValue(done)
    vi.spyOn(dashboardService, 'applications').mockResolvedValue(done)
    renderPage()
    await screen.findByText('Active partners')
    await waitFor(() => expect(screen.queryByRole('note')).toBeNull())
  })
})
