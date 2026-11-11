import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { DocumentRequests } from './DocumentRequests'

const req = {
  id: 'r1',
  application_id: 'a1',
  application_reference: 'APP-1',
  category: 'financial_statements',
  note: 'Latest audited accounts',
  due_at: null,
  status: 'open',
  is_overdue: true,
  fulfilled_document_id: null,
  fulfilled_at: null,
  created_at: '2026-11-01T00:00:00Z',
  created_by_name: 'Asha Rao',
}
const wrap = (canRequest: boolean) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <DocumentRequests appId="a1" canRequest={canRequest} />
    </QueryClientProvider>,
  )
afterEach(() => vi.restoreAllMocks())

describe('DocumentRequests', () => {
  it('lists requests, flags overdue, and posts a new one', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [req] } })
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} })
    wrap(true)
    expect(await screen.findByText('Latest audited accounts')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/What is needed/), {
      target: { value: 'Need PAN copy' },
    })
    fireEvent.change(screen.getByLabelText('Document category'), {
      target: { value: 'registration_proof' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][0]).toBe('/api/v1/reviewer/applications/a1/document-requests')
    expect(post.mock.calls[0][1]).toEqual({
      category: 'registration_proof',
      note: 'Need PAN copy',
      due_at: undefined,
    })
  })
  it('hides create and withdraw controls without permission', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [req] } })
    wrap(false)
    await screen.findByText('Latest audited accounts')
    expect(screen.queryByRole('button', { name: 'Send request' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull()
  })
})
