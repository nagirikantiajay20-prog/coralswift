import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canExecute, governanceService as svc, type PrivacyRequest } from '../service'
import GovernancePage from './GovernancePage'

const req = (o: Partial<PrivacyRequest>): PrivacyRequest => ({
  id: '1',
  reference: 'PR-1',
  email: 'a@x.test',
  kind: 'deletion',
  details: null,
  status: 'in_progress',
  resolution_note: null,
  created_at: '2026-01-01T00:00:00Z',
  ...o,
})
afterEach(() => vi.restoreAllMocks())

describe('governance', () => {
  it('allows execution only for in-progress deletions', () => {
    expect(canExecute(req({}))).toBe(true)
    expect(canExecute(req({ status: 'received' }))).toBe(false)
    expect(canExecute(req({ kind: 'access' }))).toBe(false)
  })

  it('renders requests and surfaces a backend failure as an error state', async () => {
    vi.spyOn(svc, 'privacy').mockResolvedValue({ rows: [req({})], total: 1 })
    vi.spyOn(svc, 'changes').mockRejectedValue(new Error('boom'))
    vi.spyOn(svc, 'readiness').mockResolvedValue({ gates: 'ok' })
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <GovernancePage />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('PR-1')).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Execute deletion' })).toBeTruthy()
    expect((await screen.findAllByRole('button', { name: /retry/i })).length).toBeGreaterThan(0)
  })
})
