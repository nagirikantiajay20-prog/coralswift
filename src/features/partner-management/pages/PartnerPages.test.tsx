import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import { partnerManagementService as svc } from '../services/partnerManagementService'
import PartnerDetailPage from './PartnerDetailPage'
import PartnersPage from './PartnersPage'

const wrap = (ui: React.ReactNode, path = '/') =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/p/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
const setRole = (role: 'super_administrator' | 'partner_reviewer') =>
  useAuthStore.setState({ user: { id: 'me', name: 'T', email: 't@x.test', role } })
const org = {
  id: 'abcdef12-0000',
  legal_name: 'Acme Ltd',
  status: 'active',
  country: 'IN',
  created_at: '2026-01-01T00:00:00Z',
  open_application_status: null,
}
afterEach(() => vi.restoreAllMocks())

describe('PartnersPage', () => {
  it('renders rows and shows em dash when the backend sends no total', async () => {
    vi.spyOn(svc, 'list').mockResolvedValue({ rows: [org], meta: null })
    wrap(<PartnersPage />)
    expect(await screen.findByRole('link', { name: 'Acme Ltd' })).toBeInTheDocument()
    expect((await screen.findAllByText('—')).length).toBeGreaterThan(0)
  })
  it('shows an empty state and an error state', async () => {
    vi.spyOn(svc, 'list').mockResolvedValue({ rows: [], meta: null })
    wrap(<PartnersPage />)
    expect(await screen.findByText('No partners yet')).toBeInTheDocument()
    vi.restoreAllMocks()
    vi.spyOn(svc, 'list').mockRejectedValue(new Error('boom'))
    wrap(<PartnersPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
})

describe('PartnerDetailPage', () => {
  const detail = { org, applications: [{ id: 'a1', status: 'pilot_onboarding' }] }
  it('only super administrators get the suspend action; account state is not asserted', async () => {
    vi.spyOn(svc, 'detail').mockResolvedValue(detail)
    setRole('partner_reviewer')
    wrap(<PartnerDetailPage />, '/p/abcdef12-0000')
    expect(await screen.findByText(/Account state: not exposed by backend/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspend partner' })).toBeNull()
  })
  it('super administrator sees suspend', async () => {
    vi.spyOn(svc, 'detail').mockResolvedValue(detail)
    setRole('super_administrator')
    wrap(<PartnerDetailPage />, '/p/abcdef12-0000')
    expect(await screen.findByRole('button', { name: 'Suspend partner' })).toBeInTheDocument()
  })
  it('handles 403', async () => {
    vi.spyOn(svc, 'detail').mockRejectedValue(
      new AxiosError('x', '403', undefined, undefined, {
        status: 403,
        data: { message: 'Forbidden' },
      } as never),
    )
    wrap(<PartnerDetailPage />, '/p/abc')
    expect(await screen.findByText(/do not have permission/)).toBeInTheDocument()
  })
})
