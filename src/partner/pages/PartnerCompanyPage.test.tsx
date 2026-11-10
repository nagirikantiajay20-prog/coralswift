import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { PartnerRoute } from '../components/PartnerRoute'
import { buildChanges } from '../utils/profileFields'
import PartnerCompanyPage from './PartnerCompanyPage'
import PartnerProfileChangesPage from './PartnerProfileChangesPage'

// Test doubles only; the app never ships sample data.
const partner = {
  id: 'p1',
  name: 'Pat',
  email: 'p@x.test',
  organizationId: 'o1',
  organizationName: 'Acme Ltd',
}
const ok = (data: unknown) => ({ data: { success: true, data } })
const ORG = {
  id: 'o1',
  legal_name: 'Acme Ltd',
  status: 'active',
  registration_number: 'REG-1',
  year_established: 2010,
  employee_count: 40,
  annual_turnover_inr_crore: '12.5',
  registered_address: null,
  country: 'IN',
  website: 'https://acme.test',
  service_categories: ['erp'],
  technical_capabilities: null,
  infrastructure_summary: null,
  business_description: 'We build things',
  client_references: null,
  authorized_contacts: [{ name: 'Ann', designation: 'CEO', email: 'ann@acme.test', phone: '123' }],
  profile_version: 3,
}
const routes: Record<string, unknown> = {
  '/api/v1/partner/organization': ORG,
  '/api/v1/partner/organization/completion': {
    percent: 70,
    missing_fields: ['registered_address'],
    complete: false,
  },
  '/api/v1/partner/organization/change-requests': [
    {
      id: 'c1',
      changes: { legal_name: 'Acme Holdings' },
      reason: 'Renamed',
      status: 'pending',
      decision_note: null,
      created_at: '2026-11-01T00:00:00Z',
      decided_at: null,
    },
    {
      id: 'c2',
      changes: { website: 'https://new.test' },
      reason: 'New site',
      status: 'rejected',
      decision_note: 'Please provide proof',
      created_at: '2026-10-01T00:00:00Z',
      decided_at: '2026-10-02T00:00:00Z',
    },
  ],
  '/api/v1/partner/organization/history': [
    {
      version: 3,
      changed_by: 'secret-user-id',
      changes: { employee_count: 40 },
      created_at: '2026-11-02T00:00:00Z',
    },
  ],
}
const mockGet = (override: Record<string, unknown> = {}) =>
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    const v = { ...routes, ...override }[url]
    if (v instanceof Error) throw v
    return ok(v) as never
  })

const renderAt = (path: string, el: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/partner/login" element={<p>partner login</p>} />
          <Route element={<PartnerRoute />}>
            <Route path={path} element={el} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
const company = () => renderAt('/partner/company', <PartnerCompanyPage />)
// No user-event dependency: minimal fireEvent shim.
const userEvent = {
  setup: () => ({
    click: async (el: Element) => fireEvent.click(el),
    clear: async (el: Element) => fireEvent.change(el, { target: { value: '' } }),
    type: async (el: Element, t: string) =>
      fireEvent.change(el, { target: { value: (el as HTMLInputElement).value + t } }),
  }),
}

beforeEach(() => useAuthStore.getState().setPartner(partner))
afterEach(() => {
  vi.restoreAllMocks()
  useAuthStore.getState().clear()
})

describe('buildChanges', () => {
  const orig = { legal_name: 'Acme', year_established: '2010', employee_count: '' }
  it('sends only changed, valid fields', () => {
    const r = buildChanges('company', { ...orig, legal_name: 'New' }, orig)
    expect(r.changes).toEqual({ legal_name: 'New' })
    expect(r.errors).toEqual({})
  })
  it('applies backend limits and refuses clearing', () => {
    const r = buildChanges(
      'company',
      { ...orig, legal_name: '', year_established: '1700', country: 'IND' },
      { ...orig, country: '' },
    )
    expect(r.errors).toMatchObject({
      legal_name: 'Cannot be cleared',
      year_established: 'Must be 1800 or later',
      country: 'Use the 2-letter country code',
    })
    expect(r.changes).toEqual({})
  })
  it('validates contact email', () => {
    const bad = [{ name: 'A', designation: 'B', email: 'nope', phone: '1' }]
    expect(
      buildChanges('contacts', { authorized_contacts: bad }, { authorized_contacts: [] }).errors
        .authorized_contacts,
    ).toBe('Enter a valid email')
  })
})

describe('PartnerCompanyPage', () => {
  it('redirects unauthenticated visitors without API calls', () => {
    useAuthStore.getState().clear()
    const spy = mockGet()
    company()
    expect(screen.getByText('partner login')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('shows profile data, completion, pending indicator and never sends ids', async () => {
    const spy = mockGet()
    company()
    expect(await screen.findByText('REG-1')).toBeInTheDocument()
    expect(screen.getByText('Erp')).toBeInTheDocument()
    expect(screen.getByText('Ann · CEO · ann@acme.test · 123')).toBeInTheDocument()
    expect(screen.getByText('70% complete')).toBeInTheDocument()
    expect(
      await screen.findByText(/1 profile change request is awaiting staff review/),
    ).toBeInTheDocument()
    for (const [url, cfg] of spy.mock.calls as [string, { params?: object }?][]) {
      expect(url).not.toMatch(/o1|p1/)
      expect(JSON.stringify(cfg?.params ?? {})).not.toMatch(/o1|p1|organization_id/)
    }
  })

  it('shows an access error on 403', async () => {
    mockGet({
      '/api/v1/partner/organization': Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 403, data: {} },
      }),
    })
    company()
    expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent(
      /do not have access/,
    )
  })

  it('validates, then saves only changed fields with the profile version', async () => {
    mockGet()
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue(ok({ ...ORG, employee_count: 55, profile_version: 4 }) as never)
    const user = userEvent.setup()
    company()
    await screen.findByText('REG-1')
    await user.click(screen.getByRole('button', { name: /Edit Workforce/ }))
    const form = screen.getByRole('button', { name: 'Save changes' }).closest('form')!
    const count = within(form).getByLabelText('Employee count')
    expect(count).toHaveValue(40) // prefilled
    await user.clear(count)
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))
    expect(await within(form).findByText('Cannot be cleared')).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
    await user.type(count, '55')
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith('/api/v1/partner/organization', {
        employee_count: 55,
        expected_version: 3,
      }),
    )
    expect(await screen.findByText('Changes saved.')).toBeInTheDocument()
  })

  it('explains a version conflict', async () => {
    mockGet()
    vi.spyOn(api, 'put').mockRejectedValue(
      Object.assign(new Error('c'), {
        isAxiosError: true,
        response: { status: 409, data: { message: 'conflict' } },
      }),
    )
    const user = userEvent.setup()
    company()
    await screen.findByText('REG-1')
    await user.click(screen.getByRole('button', { name: /Edit Financial/ }))
    const input = screen.getByLabelText('Annual turnover (INR crore)')
    await user.clear(input)
    await user.type(input, '20')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText(/changed elsewhere/)).toBeInTheDocument()
  })

  it('submits an approval request only with a reason', async () => {
    mockGet()
    const post = vi.spyOn(api, 'post').mockResolvedValue(ok({}) as never)
    const user = userEvent.setup()
    company()
    await screen.findByText('REG-1')
    await user.click(screen.getByRole('button', { name: /Edit Company information/ }))
    const name = screen.getByLabelText('Legal name')
    await user.clear(name)
    await user.type(name, 'Acme Holdings')
    await user.click(screen.getByRole('button', { name: 'Submit for staff approval' }))
    expect(await screen.findByText('A reason is required')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText(/Reason for change/), 'Renamed')
    await user.click(screen.getByRole('button', { name: 'Submit for staff approval' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/partner/organization/change-requests', {
        changes: { legal_name: 'Acme Holdings' },
        reason: 'Renamed',
      }),
    )
    expect(await screen.findByText(/unchanged until it is approved/)).toBeInTheDocument()
  })

  it('opens the right section from a completion link and supports cancel', async () => {
    mockGet()
    const user = userEvent.setup()
    company()
    await user.click(await screen.findByRole('button', { name: /Complete Registered address/ }))
    expect(screen.getByLabelText('Registered address')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Cancel' })[0])
    expect(screen.queryByLabelText('Registered address')).not.toBeInTheDocument()
  })
})

describe('PartnerProfileChangesPage', () => {
  it('shows request statuses, reviewer feedback and history without internal ids', async () => {
    mockGet()
    renderAt('/partner/profile-changes', <PartnerProfileChangesPage />)
    expect(await screen.findByText('Please provide proof')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('rejected')).toBeInTheDocument()
    expect(screen.getByText('https://new.test')).toBeInTheDocument()
    expect(screen.getByText('Version 3')).toBeInTheDocument()
    expect(screen.getByText('Updated: Employee count')).toBeInTheDocument()
    expect(screen.queryByText(/secret-user-id/)).not.toBeInTheDocument()
  })
})
