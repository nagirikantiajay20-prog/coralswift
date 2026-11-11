import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import PartnerNotificationsPage, { CATEGORY_ROUTES, destination } from './PartnerNotificationsPage'

const row = (id: string, category: string, related_reference: string | null, is_read = false) => ({
  id,
  template: 'application_update',
  title: `Title ${id}`,
  category,
  related_reference,
  delivery_status: 'sent',
  created_at: '2026-11-01T00:00:00Z',
  read_at: null,
  is_read,
})

describe('notification destinations', () => {
  it('maps nothing the backend has not documented', () => {
    expect(CATEGORY_ROUTES).toEqual({})
    for (const c of ['application', 'document', 'message', 'anything', '', undefined])
      expect(destination(c)).toBeUndefined()
  })
})

describe('PartnerNotificationsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      partner: { id: 'p1', name: 'P', email: 'p@x.test', organizationId: 'o', organizationName: 'O' },
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().clear()
  })

  it('shows category and reference as text only, with no link for unknown categories', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: [row('n1', 'brand_new_category', 'APP-9'), row('n2', 'document', 'DOC-1', true)] },
    })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <PartnerNotificationsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Title n1')).toBeTruthy()
    expect(screen.getByText('APP-9')).toBeTruthy()
    expect(screen.getByText('DOC-1')).toBeTruthy()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mark unread' })).toBeTruthy()
  })
})
