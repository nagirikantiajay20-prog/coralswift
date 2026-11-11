import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { PartnerRoute } from '../components/PartnerRoute'
import type { HistoryItem, PartnerApplication } from '../services/partnerDashboardService'
import { buildTracker, decisionOf, infoRequests, lifecycle } from '../utils/applicationStatus'
import PartnerApplicationPage from './PartnerApplicationPage'

// Test doubles only; the page never ships sample data.
const partner = {
  id: 'p1',
  name: 'Pat',
  email: 'p@x.test',
  organizationId: 'o1',
  organizationName: 'Acme Ltd',
}
const app = (status: string, extra: Partial<PartnerApplication> = {}): PartnerApplication => ({
  id: 'a1',
  reference: 'APP-1',
  status,
  status_label: status,
  pathway: 'direct_project_engagement',
  submission_count: 1,
  submitted_at: '2026-11-01T00:00:00Z',
  open_information_requests: 0,
  ...extra,
})
const h = (to: string, at: string, note: string | null = null): HistoryItem => ({
  to_status: to,
  to_label: to,
  note,
  created_at: at,
})
const states = (a: PartnerApplication, hist: HistoryItem[]) =>
  Object.fromEntries(buildTracker(a, hist).map((s) => [s.key, s.state]))

describe('status mapping / tracker', () => {
  const hist = [
    h('submitted', '2026-11-01T00:00:00Z'),
    h('eligibility_verification', '2026-11-02T00:00:00Z'),
    h('capability_review', '2026-11-03T00:00:00Z'),
  ]
  it('marks confirmed stages complete, the current stage, and upcoming ones', () => {
    expect(states(app('capability_review'), hist)).toEqual({
      submitted: 'complete',
      eligibility_verification: 'complete',
      capability_review: 'current',
      commercial_legal_review: 'upcoming',
      pilot_onboarding: 'upcoming',
      scale_up: 'upcoming',
    })
  })
  it('eligibility verification is not treated as approval', () => {
    expect(states(app('eligibility_verification'), hist.slice(0, 2)).pilot_onboarding).toBe(
      'upcoming',
    )
  })
  it('information_requested stays on the last reached stage', () => {
    const t = buildTracker(app('information_requested'), [
      ...hist,
      h('information_requested', '2026-11-04T00:00:00Z'),
    ])
    expect(t.find((s) => s.state === 'current')).toMatchObject({
      key: 'capability_review',
      paused: true,
    })
  })
  it('unconfirmed earlier stages are not shown as complete', () => {
    expect(
      states(app('commercial_legal_review'), [h('submitted', '2026-11-01T00:00:00Z')])
        .capability_review,
    ).toBe('unconfirmed')
  })
  it('rejected / withdrawn show no upcoming stages; draft has no tracker', () => {
    expect(Object.values(states(app('rejected'), hist))).not.toContain('upcoming')
    expect(Object.values(states(app('withdrawn'), hist))).not.toContain('upcoming')
    expect(buildTracker(app('draft', { submitted_at: null }), [])).toEqual([])
  })
})

describe('decision and lifecycle', () => {
  it('shows decisions only for backend decision statuses, with date and reason from history', () => {
    expect(decisionOf(app('capability_review'), [])).toBeNull()
    expect(decisionOf(app('withdrawn'), [])).toBeNull()
    expect(
      decisionOf(app('pilot_onboarding'), [
        h('pilot_onboarding', '2026-11-05T00:00:00Z', 'Welcome'),
      ]),
    ).toEqual({
      status: 'pilot_onboarding',
      date: '2026-11-05T00:00:00Z',
      reason: 'Welcome',
    })
  })
  it('a decision is not account provisioning or operational status', () => {
    const rows = Object.fromEntries(
      lifecycle(app('pilot_onboarding'), []).map((r) => [r.label, r.confirmed]),
    )
    expect(rows['Decision communicated']).toBe(true)
    expect(rows['Pilot onboarding']).toBe(true)
    expect(rows['Partner operational status']).toBe(false)
  })
})

const msg = (id: string, over: object) => ({
  id,
  kind: 'note',
  status: null,
  from_reviewer: true,
  body: 'x',
  requested_categories: null,
  in_reply_to: null,
  created_at: '2026-11-04T00:00:00Z',
  ...over,
})
it('infoRequests detects requests and their answered state', () => {
  const r = infoRequests([
    msg('m1', { kind: 'information_request', requested_categories: ['registration_proof'] }),
    msg('m2', { kind: 'information_request' }),
    msg('m3', { from_reviewer: false, in_reply_to: 'm2' }),
    msg('m4', {}),
  ])
  expect(r.map((x) => [x.message.id, x.answered])).toEqual([
    ['m1', false],
    ['m2', true],
  ])
})

const ok = (data: unknown) => ({ data: { success: true, data } })
const routes = (o: Record<string, unknown> = {}): Record<string, unknown> => ({
  '/api/v1/partner/applications': [app('information_requested', { open_information_requests: 1 })],
  '/api/v1/partner/applications/a1/history': [
    h('submitted', '2026-11-01T00:00:00Z'),
    h('capability_review', '2026-11-03T00:00:00Z', 'Reviewing'),
  ],
  '/api/v1/partner/applications/a1/messages': [
    msg('m1', {
      kind: 'information_request',
      body: 'Please add proof',
      requested_categories: ['registration_proof'],
    }),
    msg('m2', { body: 'General update from team' }),
  ],
  ...o,
})
const mockApi = (r = routes()) =>
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    const v = r[url]
    if (v instanceof Error) throw v
    return ok(v) as never
  })
const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/partner/application']}>
        <Routes>
          <Route path="/partner/login" element={<p>partner login</p>} />
          <Route element={<PartnerRoute />}>
            <Route path="/partner/application" element={<PartnerApplicationPage />} />
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

describe('PartnerApplicationPage', () => {
  it('redirects unauthenticated visitors without API calls', () => {
    useAuthStore.getState().clear()
    const spy = mockApi()
    renderPage()
    expect(screen.getByText('partner login')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('renders overview, progress, history, messages and navigation links', async () => {
    mockApi()
    renderPage()
    expect(await screen.findByText('APP-1')).toBeInTheDocument()
    expect(screen.getByText('Acme Ltd')).toBeInTheDocument()
    expect(screen.getByText('Direct project engagement')).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Application progress' })).toBeInTheDocument()
    expect(screen.getByText(/information requested/i, { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Reviewing')).toBeInTheDocument()
    expect(await screen.findByText('General update from team')).toBeInTheDocument()
    expect(screen.getByText('Please add proof')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Documents' })).toHaveAttribute(
      'href',
      '/partner/documents',
    )
    expect(screen.queryByText(/approved/i)).not.toBeInTheDocument()
  })

  it('submits a response for the right request and never sends an organization id', async () => {
    const spy = mockApi()
    const post = vi.spyOn(api, 'post').mockResolvedValue(ok({}) as never)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Respond' }))
    fireEvent.change(screen.getByLabelText('Your response'), { target: { value: 'Uploaded' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send response' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/partner/applications/a1/messages', {
        in_reply_to: 'm1',
        body: 'Uploaded',
      }),
    )
    for (const [url] of spy.mock.calls) expect(url).not.toMatch(/o1|p1/)
  })

  it('shows the decision with the backend status label for pilot_onboarding', async () => {
    mockApi(
      routes({
        '/api/v1/partner/applications': [
          app('pilot_onboarding', { status_label: 'Pilot onboarding' }),
        ],
        '/api/v1/partner/applications/a1/history': [
          h('pilot_onboarding', '2026-11-05T00:00:00Z', 'Congratulations'),
        ],
        '/api/v1/partner/applications/a1/messages': [],
      }),
    )
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Decision' })).toBeInTheDocument()
    expect((await screen.findAllByText('Congratulations')).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/does not change your account access/)[0]).toBeInTheDocument()
  })

  it('offers to start an application when none exists and creates it via POST', async () => {
    mockApi(routes({ '/api/v1/partner/applications': [] }))
    const post = vi.spyOn(api, 'post').mockResolvedValue(ok(app('draft')) as never)
    renderPage()
    const create = await screen.findByRole('button', { name: 'Create draft application' })
    fireEvent.click(create)
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a partner pathway')
    expect(post).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'vendor_subcontracting' },
    })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' Hello ' } })
    fireEvent.click(create)
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/partner/applications', {
        pathway: 'vendor_subcontracting',
        cover_note: 'Hello',
      }),
    )
  })

  it('creates with only the pathway when no cover note is given, and surfaces a backend rejection', async () => {
    mockApi(routes({ '/api/v1/partner/applications': [] }))
    const post = vi.spyOn(api, 'post').mockRejectedValue(new Error('already exists'))
    renderPage()
    await screen.findByRole('button', { name: 'Create draft application' })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'direct_project_engagement' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create draft application' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/partner/applications', {
        pathway: 'direct_project_engagement',
        cover_note: undefined,
      }),
    )
    // the form stays available so the partner can retry
    expect(screen.getByRole('button', { name: 'Create draft application' })).toBeEnabled()
  })

  it('rejects an over-long cover note before calling the API', async () => {
    mockApi(routes({ '/api/v1/partner/applications': [] }))
    const post = vi.spyOn(api, 'post')
    renderPage()
    await screen.findByRole('button', { name: 'Create draft application' })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'vendor_subcontracting' } })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x'.repeat(4001) } })
    fireEvent.click(screen.getByRole('button', { name: 'Create draft application' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Maximum 4000 characters')
    expect(post).not.toHaveBeenCalled()
  })

  it('shows an error with retry when the application list fails (e.g. 403)', async () => {
    mockApi(routes({ '/api/v1/partner/applications': new Error('boom') }))
    renderPage()
    expect(
      await screen.findByRole('button', { name: /retry/i }, { timeout: 4000 }),
    ).toBeInTheDocument()
  })

  it('isolates a failing history call from the rest of the page', async () => {
    mockApi(routes({ '/api/v1/partner/applications/a1/history': new Error('boom') }))
    renderPage()
    expect(await screen.findByText('APP-1')).toBeInTheDocument()
    expect(
      (await screen.findAllByRole('button', { name: /retry/i }, { timeout: 4000 })).length,
    ).toBeGreaterThan(0)
    expect(await screen.findByText('Please add proof')).toBeInTheDocument()
  })
})
