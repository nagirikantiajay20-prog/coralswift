import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { partnerApplicationsService } from '@/features/partner-applications/services/partnerApplicationsService'
import DocumentsPage from './DocumentsPage'

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <DocumentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

afterEach(() => vi.restoreAllMocks())

describe('DocumentsPage', () => {
  it('marks global metrics unavailable instead of inventing numbers', async () => {
    vi.spyOn(partnerApplicationsService, 'list').mockResolvedValue({ rows: [], meta: null })
    renderPage()
    expect(screen.getAllByText(/no admin-wide document endpoint/i)).toHaveLength(7)
    expect(await screen.findByText('No applications found')).toBeInTheDocument()
  })
  it('lists applications with a link to their documents', async () => {
    vi.spyOn(partnerApplicationsService, 'list').mockResolvedValue({
      rows: [
        {
          id: 'a1',
          reference: 'APP-1',
          organization_id: 'o',
          organization_name: 'Acme',
          status: 'submitted',
          pathway: 'p',
          assigned_reviewer_id: null,
          submission_count: 1,
          submitted_at: null,
        },
      ],
      meta: null,
    })
    renderPage()
    expect(await screen.findByRole('link', { name: /documents for APP-1/i })).toHaveAttribute(
      'href',
      '/admin/documents/a1',
    )
  })
  it('shows the backend error (e.g. 403) with retry', async () => {
    vi.spyOn(partnerApplicationsService, 'list').mockRejectedValue(
      new AxiosError('x', 'E', undefined, undefined, {
        status: 403,
        data: { message: 'Forbidden for your role' },
      } as never),
    )
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Forbidden for your role'),
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
