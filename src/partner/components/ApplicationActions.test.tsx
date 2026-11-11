import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import type { PartnerApplication } from '../services/partnerDashboardService'
import { ApplicationActions, applicationActions } from './ApplicationActions'

const app = (status: string, extra: Partial<PartnerApplication> = {}): PartnerApplication => ({
  id: 'a1',
  reference: 'APP-1',
  status,
  status_label: status,
  pathway: 'direct_project_engagement',
  submission_count: 0,
  submitted_at: null,
  open_information_requests: 0,
  ...extra,
})
const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } })
const mount = (a: PartnerApplication) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ApplicationActions app={a} />
    </QueryClientProvider>,
  )

describe('applicationActions', () => {
  it('offers only what the status allows', () => {
    expect(applicationActions(app('draft'))).toMatchObject({ edit: true, submit: true, resubmit: false })
    expect(applicationActions(app('submitted'))).toMatchObject({ edit: false, submit: false, withdraw: true })
    expect(applicationActions(app('information_requested', { open_information_requests: 2 })).resubmit).toBe(false)
    expect(applicationActions(app('information_requested')).resubmit).toBe(true)
    for (const s of ['rejected', 'withdrawn', 'pilot_onboarding', 'scale_up'])
      expect(applicationActions(app(s)).withdraw).toBe(false)
  })
})

describe('ApplicationActions', () => {
  beforeEach(() => {
    useAuthStore.setState({
      partner: { id: 'p1', name: 'P', email: 'p@x.test', organizationId: 'o', organizationName: 'O' },
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().clear()
  })

  it('blocks submit while the backend reports missing items and lists them', async () => {
    vi.spyOn(api, 'get').mockImplementation(() =>
      ok({ complete: false, missing_profile_fields: ['legal_name'], missing_document_categories: ['insurance'] }),
    )
    mount(app('draft'))
    expect(await screen.findByText('Profile: Legal name')).toBeTruthy()
    expect(screen.getByText('Document: Insurance')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Submit for review' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('submits a ready draft', async () => {
    vi.spyOn(api, 'get').mockImplementation(() =>
      ok({ complete: true, missing_profile_fields: [], missing_document_categories: [] }),
    )
    const post = vi.spyOn(api, 'post').mockImplementation(() => ok(app('submitted')))
    mount(app('draft'))
    const btn = await screen.findByRole('button', { name: 'Submit for review' })
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(btn)
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/partner/applications/a1/submit'))
  })

  it('saves draft edits with only provided fields', async () => {
    vi.spyOn(api, 'get').mockImplementation(() =>
      ok({ complete: true, missing_profile_fields: [], missing_document_categories: [] }),
    )
    const patch = vi.spyOn(api, 'patch').mockImplementation(() => ok(app('draft')))
    mount(app('draft'))
    fireEvent.click(await screen.findByRole('button', { name: 'Save draft' }))
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/api/v1/partner/applications/a1', {
        pathway: 'direct_project_engagement',
        cover_note: undefined,
      }),
    )
  })

  it('withdraws with an optional note after confirmation', async () => {
    const post = vi.spyOn(api, 'post').mockImplementation(() => ok(app('withdrawn')))
    mount(app('submitted'))
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw application' }))
    fireEvent.change(await screen.findByLabelText('Reason (optional)'), { target: { value: ' changed plans ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/partner/applications/a1/withdraw', { note: 'changed plans' }),
    )
  })

  it('offers resubmit only when no information requests are open, and renders nothing after a decision', async () => {
    const post = vi.spyOn(api, 'post').mockImplementation(() => ok(app('submitted')))
    const { unmount } = mount(app('information_requested'))
    fireEvent.click(screen.getByRole('button', { name: /Resubmit/ }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/partner/applications/a1/resubmit'))
    unmount()
    const { container } = mount(app('rejected'))
    expect(container.textContent).toBe('')
  })
})
