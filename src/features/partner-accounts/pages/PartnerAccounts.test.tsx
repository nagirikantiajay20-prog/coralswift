import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { partnerApplicationsService } from '@/features/partner-applications/services/partnerApplicationsService'
import { partnerManagementService as pm } from '@/features/partner-management/services/partnerManagementService'
import { useAuthStore } from '@/store/authStore'
import { partnerAccountsService } from '../services/partnerAccountsService'
import {
  CAPABILITIES,
  actionsFor,
  inOnboarding,
  onboardingApplications,
  toEvents,
} from '../utils/accounts'
import PartnerAccountDetailPage from './PartnerAccountDetailPage'
import PartnerAccountsPage from './PartnerAccountsPage'

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
  open_application_status: 'pilot_onboarding',
}
afterEach(() => vi.restoreAllMocks())

describe('account utils', () => {
  it('only onboarding stages are provisioning candidates; approval/other stages are not', () => {
    expect(inOnboarding('pilot_onboarding')).toBe(true)
    expect(inOnboarding('scale_up')).toBe(true)
    expect(inOnboarding('capability_review')).toBe(false)
    expect(inOnboarding(null)).toBe(false)
    expect(
      onboardingApplications([
        { id: 'a', status: 'submitted' },
        { id: 'b', status: 'scale_up' },
      ]),
    ).toEqual([{ id: 'b', status: 'scale_up' }])
  })
  it('maps audit rows without carrying sensitive meta', () => {
    const [e] = toEvents([
      {
        id: '1',
        record_type: 'org',
        record_id: 'r',
        action: 'x',
        actor_type: 'staff',
        actor_user_id: 'u',
        organization_id: 'o',
        created_at: 't',
        meta: { token: 'secret' },
      } as never,
    ])
    expect(JSON.stringify(e)).not.toContain('secret')
  })
  it('offers only state-appropriate account actions', () => {
    const a = (status: string, invitation_state: string) =>
      actionsFor({ status, invitation_state }).map((x) => x.action)
    expect(a('invited', 'pending')).toEqual(['invitation/resend', 'invitation/revoke'])
    expect(a('invited', 'revoked')).toEqual(['invitation/resend'])
    expect(a('active', 'accepted')).toEqual(['suspend'])
    expect(a('deactivated', 'accepted')).toEqual(['reactivate'])
  })
  it('capability matrix still marks partner role management as missing', () => {
    const missing = CAPABILITIES.filter((c) => c.support === 'missing').map((c) => c.operation)
    expect(missing.join()).toMatch(/Role/)
  })
})

describe('PartnerAccountsPage', () => {
  it('lists real partner accounts and organizations, never fabricated rows', async () => {
    vi.spyOn(pm, 'list').mockResolvedValue({ rows: [org], meta: null })
    const accounts = vi.spyOn(partnerAccountsService, 'list').mockResolvedValue({
      rows: [
        {
          id: 'u1',
          email: 'pat@acme.test',
          full_name: 'Pat Partner',
          user_type: 'partner',
          status: 'invited',
          invitation_state: 'pending',
          mfa_enabled: false,
          last_login_at: null,
          created_at: '2026-01-01T00:00:00Z',
          organization: { id: org.id, legal_name: 'Acme Ltd' },
        },
      ],
      meta: null,
    })
    wrap(<PartnerAccountsPage />)
    expect(await screen.findByText('pat@acme.test')).toBeInTheDocument()
    expect(screen.getByText('Never')).toBeInTheDocument()
    expect(accounts).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
    expect(await screen.findByRole('link', { name: 'Acme Ltd' })).toBeInTheDocument()
  })
  it('suspend needs confirmation, then posts to the account action endpoint', async () => {
    vi.spyOn(pm, 'list').mockResolvedValue({ rows: [], meta: null })
    vi.spyOn(partnerAccountsService, 'list').mockResolvedValue({
      rows: [
        {
          id: 'u1',
          email: 'pat@acme.test',
          full_name: 'Pat Partner',
          user_type: 'partner',
          status: 'active',
          invitation_state: 'accepted',
          mfa_enabled: true,
          last_login_at: null,
          created_at: '2026-01-01T00:00:00Z',
          organization: null,
        },
      ],
      meta: null,
    })
    const act = vi.spyOn(partnerAccountsService, 'act').mockResolvedValue()
    wrap(<PartnerAccountsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Suspend: pat@acme.test' }))
    expect(act).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Suspend' }))
    await waitFor(() => expect(act).toHaveBeenCalledWith('u1', 'suspend'))
  })
  it('shows an error state', async () => {
    vi.spyOn(partnerAccountsService, 'list').mockResolvedValue({ rows: [], meta: null })
    vi.spyOn(pm, 'list').mockRejectedValue(new Error('boom'))
    wrap(<PartnerAccountsPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
})

describe('PartnerAccountDetailPage', () => {
  const detail = { org, applications: [{ id: 'a1', status: 'pilot_onboarding' }] }
  it('non-super-administrators cannot provision or read the audit trail', async () => {
    vi.spyOn(pm, 'detail').mockResolvedValue(detail)
    const ev = vi.spyOn(partnerAccountsService, 'events')
    setRole('partner_reviewer')
    wrap(<PartnerAccountDetailPage />, '/p/abcdef12-0000')
    expect(await screen.findByText(/Only a Super Administrator can provision/)).toBeInTheDocument()
    expect(ev).not.toHaveBeenCalled()
  })
  it('does not offer provisioning before the onboarding stage', async () => {
    vi.spyOn(pm, 'detail').mockResolvedValue({
      org,
      applications: [{ id: 'a1', status: 'submitted' }],
    })
    vi.spyOn(partnerAccountsService, 'events').mockResolvedValue([])
    const d = vi.spyOn(partnerApplicationsService, 'detail')
    setRole('super_administrator')
    wrap(<PartnerAccountDetailPage />, '/p/abcdef12-0000')
    expect(
      await screen.findByText(/No application has reached the onboarding stage/),
    ).toBeInTheDocument()
    expect(d).not.toHaveBeenCalled()
    expect(await screen.findByText('No audit events returned for this partner')).toBeInTheDocument()
  })
  it('does not offer provisioning for a suspended partnership', async () => {
    vi.spyOn(pm, 'detail').mockResolvedValue({
      org: { ...org, status: 'suspended' },
      applications: detail.applications,
    })
    vi.spyOn(partnerAccountsService, 'events').mockResolvedValue([])
    setRole('super_administrator')
    wrap(<PartnerAccountDetailPage />, '/p/abcdef12-0000')
    expect(await screen.findByText(/Partnership is suspended/)).toBeInTheDocument()
  })
})
