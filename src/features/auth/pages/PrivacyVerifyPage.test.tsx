import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import PrivacyVerifyPage from './PrivacyVerifyPage'

const view = (url: string) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[url]}>
        <PrivacyVerifyPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
afterEach(() => vi.restoreAllMocks())

describe('PrivacyVerifyPage', () => {
  it('does nothing until clicked, then posts the token once', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} })
    view('/privacy/verify?token=abcdefghij123')
    expect(post).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm my email' }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0]).toEqual([
      '/api/v1/privacy/requests/verify',
      { token: 'abcdefghij123' },
    ])
    expect(await screen.findByText('Email confirmed')).toBeInTheDocument()
  })
  it('disables confirm and explains when the token is missing', () => {
    view('/privacy/verify')
    expect(screen.getByRole('alert')).toHaveTextContent(/missing its token/)
    expect(screen.getByRole('button', { name: 'Confirm my email' })).toBeDisabled()
  })
  it('shows the backend error for an expired or used token', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { message: 'x', error: { code: 'TOKEN_EXPIRED' } } },
    })
    view('/privacy/verify?token=abcdefghij123')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm my email' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/expired/)
  })
})
