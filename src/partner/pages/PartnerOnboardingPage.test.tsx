import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { PartnerRoute } from '../components/PartnerRoute'
import type { HistoryItem, PartnerApplication } from '../services/partnerDashboardService'
import {
  onboardingHistory,
  onboardingLifecycle,
  onboardingMessages,
  onboardingSummary,
  onboardingTracker,
  partnerActions,
} from '../utils/onboarding'
import PartnerOnboardingPage from './PartnerOnboardingPage'

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
const msg = (id: string, over: object) => ({
  id,
  kind: 'note',
  status: null,
  from_reviewer: true,
  body: 'x',
  requested_categories: null,
  in_reply_to: null,
  created_at: '2026-11-06T00:00:00Z',
  ...over,
})
const doc = (id: string, category: string, review_status: string) => ({
  id,
  category,
  status: 'active',
  current_version: { review_status },
})

const reviewHist = [
  h('submitted', '2026-11-01T00:00:00Z'),
  h('capability_review', '2026-11-03T00:00:00Z'),
]
const onboardHist = [...reviewHist, h('pilot_onboarding', '2026-11-05T00:00:00Z', 'Welcome aboard')]

describe('onboarding derivation', () => {
  it('application review alone is not onboarding', () => {
    const s = onboardingSummary(app('capability_review'), reviewHist)
    expect(s).toMatchObject({ phase: 'not_started', initiatedAt: null })
    expect(onboardingTracker(app('capability_review'), reviewHist)).toEqual([])
    expect(onboardingHistory(reviewHist)).toEqual([])
  })
  it('pilot_onboarding means initiated, current stage, scale-up upcoming, no completion', () => {
    const s = onboardingSummary(app('pilot_onboarding'), onboardHist)
    expect(s).toMatchObject({ phase: 'pilot_onboarding', initiatedAt: '2026-11-05T00:00:00Z' })
    expect(onboardingTracker(app('pilot_onboarding'), onboardHist).map((x) => x.state)).toEqual([
      'current',
      'upcoming',
    ])
    expect(onboardingHistory(onboardHist).map((x) => x.to_status)).toEqual(['pilot_onboarding'])
  })
  it('scale_up marks pilot onboarding complete; information_requested keeps the reached phase', () => {
    const hist = [...onboardHist, h('scale_up', '2026-11-08T00:00:00Z')]
    expect(onboardingTracker(app('scale_up'), hist).map((x) => x.state)).toEqual([
      'complete',
      'current',
    ])
    expect(onboardingSummary(app('information_requested'), onboardHist).phase).toBe(
      'pilot_onboarding',
    )
  })
  it('rejected / withdrawn show no onboarding progress', () => {
    for (const st of ['rejected', 'withdrawn']) {
      expect(onboardingSummary(app(st), onboardHist).phase).toBe('closed')
      expect(onboardingTracker(app(st), onboardHist)).toEqual([])
    }
  })
  it('lifecycle never confirms onboarding completion', () => {
    const rows = Object.fromEntries(
      onboardingLifecycle(app('scale_up'), onboardHist).map((r) => [r.label, r.confirmed]),
    )
    expect(rows['Onboarding completed']).toBe(false)
    expect(rows['Partner operational status']).toBe(false)
    expect(rows['Pilot onboarding']).toBe(true)
  })
  it('actions come only from backend data and link to existing modules', () => {
    const actions = partnerActions({
      messages: [
        msg('m1', { kind: 'information_request', body: 'Add proof' }),
        msg('m2', { kind: 'information_request' }),
        msg('m3', { from_reviewer: false, in_reply_to: 'm2' }),
      ],
      documents: [doc('d1', 'registration_proof', 'rejected'), doc('d2', 'x', 'accepted')] as never,
      completion: { percent: 50, complete: false, missing_fields: ['website'] },
    })
    expect(actions.map((a) => [a.id, a.to])).toEqual([
      ['req-m1', '/partner/application'],
      ['doc-d1', '/partner/documents'],
      ['profile', '/partner/company'],
    ])
    expect(partnerActions({ messages: [], documents: [], completion: null })).toEqual([])
  })
  it('onboarding messages are reviewer messages from initiation, with response status', () => {
    const out = onboardingMessages(
      [
        msg('old', { created_at: '2026-11-02T00:00:00Z' }),
        msg('r1', { kind: 'information_request' }),
        msg('p', { from_reviewer: false, in_reply_to: 'r1' }),
      ],
      '2026-11-05T00:00:00Z',
    )
    expect(out).toMatchObject([{ message: { id: 'r1' }, needsResponse: true, answered: true }])
    expect(onboardingMessages([msg('r1', {})], null)).toEqual([])
  })
})

const ok = (data: unknown) => ({ data: { success: true, data } })
const routes = (o: Record<string, unknown> = {}): Record<string, unknown> => ({
  '/api/v1/partner/applications': [app('pilot_onboarding', { status_label: 'Pilot onboarding' })],
  '/api/v1/partner/applications/a1/history': onboardHist,
  '/api/v1/partner/applications/a1/messages': [
    msg('m1', { kind: 'information_request', body: 'Please upload the NDA' }),
  ],
  '/api/v1/partner/documents': [doc('d1', 'registration_proof', 'accepted')],
  '/api/v1/partner/organization/completion': {
    percent: 80,
    complete: false,
    missing_fields: ['website'],
  },
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
      <MemoryRouter initialEntries={['/partner/onboarding']}>
        <Routes>
          <Route path="/partner/login" element={<p>partner login</p>} />
          <Route element={<PartnerRoute />}>
            <Route path="/partner/onboarding" element={<PartnerOnboardingPage />} />
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

describe('PartnerOnboardingPage', () => {
  it('redirects unauthenticated visitors without API calls', () => {
    useAuthStore.getState().clear()
    const spy = mockApi()
    renderPage()
    expect(screen.getByText('partner login')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('renders overview, tracker, actions, documents, messages, history and the provisioning boundary', async () => {
    const spy = mockApi()
    const post = vi.spyOn(api, 'post')
    renderPage()
    expect(
      await screen.findByText('Onboarding initiated', { selector: 'span' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Acme Ltd')).toBeInTheDocument()
    expect(screen.getByText('Not issued by the backend')).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Onboarding progress' })).toBeInTheDocument()
    expect(await screen.findByText('Complete missing company information')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Update company profile' })).toHaveAttribute(
      'href',
      '/partner/company',
    )
    expect(screen.getAllByRole('link', { name: 'Respond in Application' })[0]).toHaveAttribute(
      'href',
      '/partner/application',
    )
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByText('Welcome aboard')).toBeInTheDocument()
    expect(screen.getByText(/has not published an onboarding checklist/)).toBeInTheDocument()
    expect(screen.getByText(/not changed from this page/)).toBeInTheDocument()
    expect(screen.queryByText(/approved/i)).not.toBeInTheDocument()
    // read-only: no writes, no partner/organization id in any request
    expect(post).not.toHaveBeenCalled()
    for (const [url] of spy.mock.calls) expect(url).not.toMatch(/o1|p1/)
  })

  it('shows not-started wording while the application is still under review', async () => {
    mockApi(
      routes({
        '/api/v1/partner/applications': [app('capability_review')],
        '/api/v1/partner/applications/a1/history': reviewHist,
      }),
    )
    renderPage()
    expect(await screen.findByText('Not started')).toBeInTheDocument()
    expect(screen.getByText(/appear once onboarding has been initiated/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Onboarding progress' })).not.toBeInTheDocument()
  })

  it('shows no outstanding actions and empty states', async () => {
    mockApi(
      routes({
        '/api/v1/partner/applications/a1/messages': [],
        '/api/v1/partner/documents': [],
        '/api/v1/partner/organization/completion': {
          percent: 100,
          complete: true,
          missing_fields: [],
        },
      }),
    )
    renderPage()
    expect(await screen.findByText('No outstanding actions.')).toBeInTheDocument()
    expect(screen.getByText('No documents on file.')).toBeInTheDocument()
    expect(screen.getByText('No onboarding messages.')).toBeInTheDocument()
  })

  it('shows empty state with no application', async () => {
    mockApi(routes({ '/api/v1/partner/applications': [] }))
    renderPage()
    expect(await screen.findByText('No onboarding on record')).toBeInTheDocument()
  })

  it('shows an error with retry when applications fail', async () => {
    mockApi(routes({ '/api/v1/partner/applications': new Error('boom') }))
    renderPage()
    expect(
      await screen.findByRole('button', { name: /retry/i }, { timeout: 4000 }),
    ).toBeInTheDocument()
  })

  it('isolates a failing documents call', async () => {
    mockApi(routes({ '/api/v1/partner/documents': new Error('boom') }))
    renderPage()
    expect(
      await screen.findByText('Onboarding initiated', { selector: 'span' }),
    ).toBeInTheDocument()
    expect(
      (await screen.findAllByRole('button', { name: /retry/i }, { timeout: 4000 })).length,
    ).toBeGreaterThan(0)
    expect(await screen.findByText('Welcome aboard')).toBeInTheDocument()
  })
})
