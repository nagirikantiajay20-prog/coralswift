import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import type { ReviewerApplication } from '../types'
import { ReviewActions } from './ReviewActions'

const app = (extra: Partial<ReviewerApplication> = {}): ReviewerApplication => ({
  id: 'a1',
  reference: 'APP-1',
  organization_id: 'o1',
  organization_name: 'Acme',
  status: 'submitted',
  pathway: 'direct_project_engagement',
  assigned_reviewer_id: null,
  submission_count: 1,
  submitted_at: null,
  allowed_next: ['eligibility_verification'],
  ...extra,
})
const rule = (needs_reason: boolean, needs_assigned_reviewer: boolean) => ({
  data: {
    success: true,
    data: [
      { from: 'submitted', to: 'eligibility_verification', needs_reason, needs_assigned_reviewer, dedicated_endpoint: false },
    ],
  },
})

async function openStage(rules: unknown) {
  vi.spyOn(api, 'get').mockImplementation((url) =>
    url.includes('/transitions') ? (rules as never) : Promise.reject(new Error('unexpected ' + url)),
  )
  const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReviewActions app={app()} />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: /change stage/ }))
  fireEvent.change(await screen.findByLabelText('New stage'), {
    target: { value: 'eligibility_verification' },
  })
  await waitFor(() => expect(api.get).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  return post
}

describe('stage change honours GET /reviewer/transitions', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'me', name: 'T', email: 't@x.test', role: 'partner_reviewer' },
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().clear()
  })

  it('requires a reason when the backend rule says so', async () => {
    const post = await openStage(Promise.resolve(rule(true, false)))
    expect(await screen.findByText('A reason is required for this change')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })

  it('requires an assigned reviewer when the backend rule says so', async () => {
    const post = await openStage(Promise.resolve(rule(false, true)))
    expect(await screen.findByText('Assign a reviewer before this change')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })

  it('falls back to built-in rules when the rules request fails', async () => {
    const post = await openStage(Promise.reject(new Error('down')))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/api/v1/reviewer/applications/a1/transition',
        expect.objectContaining({ to_status: 'eligibility_verification' }),
      ),
    )
  })
})
