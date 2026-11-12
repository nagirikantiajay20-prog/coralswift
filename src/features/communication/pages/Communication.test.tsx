import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import { communicationService as svc } from '../services/communicationService'
import {
  canRetry,
  CAPABILITIES,
  filterDeliveries,
  STATUS_LABEL,
  templateSchema,
  toDelivery,
} from '../utils/communication'
import CommunicationsPage from './CommunicationsPage'
import DeliveryPage from './DeliveryPage'
import NotificationsFeedPage from './NotificationsFeedPage'
import { EmailsPage } from './UnavailablePages'

const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
const setRole = (role: 'super_administrator' | 'business_development_manager') =>
  useAuthStore.setState({ user: { id: 'me', name: 'T', email: 't@x.test', role } })
afterEach(() => vi.restoreAllMocks())

const row = {
  id: 'abcdef12-1',
  status: 'failed',
  type: 'info_request',
  to: 'a@x.test',
  subject: 'Hi',
  last_error: 'SMTP 550',
  body: 'SECRET BODY',
  created_at: '2026-01-01T00:00:00Z',
  attempts: 3,
}

describe('delivery mapping', () => {
  it('maps whitelisted fields and drops bodies', () => {
    const d = toDelivery(row, false)
    expect(d).toMatchObject({
      recipient: 'a@x.test',
      failure: 'SMTP 550',
      status: 'failed',
      attempts: 3,
    })
    expect(JSON.stringify(d)).not.toContain('SECRET')
  })
  it('rejects rows without id and unknown statuses', () => {
    expect(toDelivery({ status: 'failed' }, true)).toBeNull()
    expect(toDelivery({ id: 'x', status: 'delivered' }, true)?.status).toBeNull()
  })
  it('redacts strategic rows without strategic access, shows them with it', () => {
    const s = { ...row, type: 'strategic_enquiry_ack', subject: 'Acquisition of X', is_strategic: true }
    expect(toDelivery(s, false)).toMatchObject({ restricted: true, subject: null, recipient: null })
    expect(toDelivery(s, true)).toMatchObject({ restricted: false, subject: 'Acquisition of X' })
  })
  it('only uses backend statuses; "sent" is not called delivered; only failed retries', () => {
    expect(Object.keys(STATUS_LABEL)).toEqual(['pending', 'sent', 'logged', 'failed'])
    expect(STATUS_LABEL.sent).not.toMatch(/deliver/i)
    expect(canRetry(toDelivery(row, true)!)).toBe(true)
    expect(canRetry(toDelivery({ ...row, status: 'sent' }, true)!)).toBe(false)
  })
  it('filters the loaded page by text', () => {
    const rows = [
      toDelivery(row, true)!,
      toDelivery({ id: 'y', status: 'sent', subject: 'Other' }, true)!,
    ]
    expect(filterDeliveries(rows, 'other')).toHaveLength(1)
    expect(filterDeliveries(rows, '')).toHaveLength(2)
  })
})

describe('template validation', () => {
  it('requires subject and text, enforces limits, normalises empty html to null', () => {
    expect(templateSchema.safeParse({ subject: ' ', text_body: 'x', html_body: '' }).success).toBe(
      false,
    )
    expect(
      templateSchema.safeParse({ subject: 'a'.repeat(201), text_body: 'x', html_body: '' }).success,
    ).toBe(false)
    expect(templateSchema.safeParse({ subject: 's', text_body: '', html_body: '' }).success).toBe(
      false,
    )
    const ok = templateSchema.parse({ subject: 's', text_body: 't', html_body: '  ' })
    expect(ok.html_body).toBeNull()
  })
})

it('capability matrix lists no feed, send, preferences or history support', () => {
  const missing = CAPABILITIES.filter((c) => c.support === 'missing')
    .map((c) => c.operation)
    .join('|')
  expect(missing).toMatch(/ad-hoc email/)
  expect(missing).toMatch(/preferences/)
  expect(missing).toMatch(/communication history/)
})

describe('pages', () => {
  it('delivery page shows rows with failure reason and redacts strategic', async () => {
    setRole('business_development_manager')
    vi.spyOn(svc, 'outbox').mockResolvedValue({
      rows: [
        row,
        {
          ...row,
          id: 'ffffffff-2',
          type: 'strategic_ack', is_strategic: true,
          subject: 'Merger plan',
          last_error: 'leak',
        },
      ],
      meta: null,
    })
    wrap(<DeliveryPage />)
    expect(await screen.findByText('SMTP 550')).toBeInTheDocument()
    expect(screen.queryByText('Merger plan')).toBeNull()
    expect(screen.queryByText('leak')).toBeNull()
    expect(screen.getAllByRole('button', { name: /Retry$/ }).length).toBeGreaterThan(0)
  })
  it('delivery page empty and error states', async () => {
    setRole('super_administrator')
    const spy = vi.spyOn(svc, 'outbox').mockResolvedValue({ rows: [], meta: null })
    const { unmount } = wrap(<DeliveryPage />)
    expect(await screen.findByText(/No failed emails/)).toBeInTheDocument()
    unmount()
    spy.mockRejectedValue(new Error('boom'))
    wrap(<DeliveryPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
  it('dashboard shows em dash when totals are missing and marks unavailable metrics', async () => {
    setRole('super_administrator')
    vi.spyOn(svc, 'outbox').mockResolvedValue({ rows: [], meta: null })
    vi.spyOn(svc, 'feed').mockResolvedValue({ rows: [], meta: { unread: 4 } })
    wrap(<CommunicationsPage />)
    expect(await screen.findByText('Unavailable: no delivery receipts')).toBeInTheDocument()
    expect(await screen.findByText('Unread admin notifications')).toBeInTheDocument()
    expect(await screen.findByText('4')).toBeInTheDocument()
  })
  it('email page is an explicit unavailable state with no send control', () => {
    wrap(<EmailsPage />)
    expect(screen.getByText(/does not support this yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send/i })).toBeNull()
  })
})

describe('notifications feed', () => {
  it('lists own items, marks one read and refreshes', async () => {
    const item = {
      id: 'f1',
      kind: 'enquiry_assigned',
      title: 'New enquiry assigned',
      record_type: 'enquiry',
      record_id: 'r1',
      is_strategic: false,
      created_at: '2026-01-01T00:00:00Z',
      read_at: null,
      is_read: false,
      archived_at: null,
    }
    vi.spyOn(svc, 'feed').mockResolvedValue({ rows: [item], meta: { unread: 1, pages: 1 } })
    const read = vi.spyOn(svc, 'feedRead').mockResolvedValue({} as never)
    wrap(<NotificationsFeedPage />)
    expect(await screen.findByText('New enquiry assigned')).toBeInTheDocument()
    expect(screen.getByText('1 unread')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Mark read' }).click()
    await vi.waitFor(() => expect(read.mock.calls[0]?.[0]).toBe('f1'))
  })
})
