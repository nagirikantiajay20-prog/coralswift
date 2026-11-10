import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import PartnerMessagesPage from './PartnerMessagesPage'
import PartnerNotificationsPage from './PartnerNotificationsPage'

// Test doubles only; the pages never ship sample data.
const partner = {
  id: 'p1',
  name: 'Pat',
  email: 'p@x.test',
  organizationId: 'o1',
  organizationName: 'Acme',
}
const msg = {
  id: 'm1',
  kind: 'information_request',
  status: null,
  from_reviewer: true,
  body: 'Send accounts',
  requested_categories: null,
  in_reply_to: null,
  created_at: '2026-01-02T00:00:00Z',
}
// Longest matching path first so '/applications/a1/messages' wins over '/applications'.
const mock = (routes: Record<string, unknown>) =>
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    const hit = Object.keys(routes)
      .filter((k) => url.endsWith(k))
      .sort((x, y) => y.length - x.length)[0]
    const v = hit ? routes[hit] : []
    if (v instanceof Error) throw v
    return { data: { success: true, data: v } } as never
  })
const view = (el: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{el}</MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => useAuthStore.setState({ partner } as never))
afterEach(() => vi.restoreAllMocks())

describe('partner messages', () => {
  it('shows a pending request and the history', async () => {
    mock({
      '/applications': [{ id: 'a1', reference: 'APP-1', submitted_at: null }],
      '/applications/a1/messages': [msg],
    })
    view(<PartnerMessagesPage />)
    expect((await screen.findAllByText('Awaiting your response')).length).toBe(2)
    expect(screen.getAllByText('Send accounts').length).toBe(2)
  })
  it('shows an empty state without an application', async () => {
    mock({})
    view(<PartnerMessagesPage />)
    expect(await screen.findByText('No application yet')).toBeTruthy()
  })
  it('shows an error with retry on API failure', async () => {
    mock({ '/applications': new Error('boom') })
    view(<PartnerMessagesPage />)
    expect(await screen.findByRole('button', { name: /retry/i }, { timeout: 5000 })).toBeTruthy()
  })
})

describe('partner notifications', () => {
  it('lists email rows', async () => {
    mock({ '/notifications': [{ type: 'application_received', status: 'sent' }] })
    view(<PartnerNotificationsPage />)
    expect(await screen.findByText('Application received')).toBeTruthy()
  })
  it('marks one / all unread notifications as read via the backend endpoints', async () => {
    mock({
      '/notifications': [
        { id: 'n1', template: 'application_received', delivery_status: 'sent', is_read: false },
        { id: 'n2', template: 'documents_requested', delivery_status: 'sent', is_read: true },
      ],
    })
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { success: true, data: null } } as never)
    view(<PartnerNotificationsPage />)
    await screen.findByText('Application received')
    expect(screen.getAllByRole('button', { name: 'Mark read' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/partner/notifications/n1/read'))
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/partner/notifications/read-all'))
  })
  it('shows empty state', async () => {
    mock({ '/notifications': [] })
    view(<PartnerNotificationsPage />)
    expect(await screen.findByText('No notifications')).toBeTruthy()
  })
  it('shows an error with retry', async () => {
    mock({ '/notifications': new Error('boom') })
    view(<PartnerNotificationsPage />)
    expect(await screen.findByRole('button', { name: /retry/i }, { timeout: 5000 })).toBeTruthy()
  })
})
