import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import PartnerActivatePage from './pages/PartnerActivatePage'

const app = (path: string) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
  >
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/partner/activate" element={<PartnerActivatePage />} />
        <Route path="/partner/login" element={<p>login page</p>} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>
)
const fill = (a: string, b: string) => {
  fireEvent.change(screen.getByLabelText(/^Password$/), { target: { value: a } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: b } })
  fireEvent.click(screen.getByRole('button', { name: 'Activate account' }))
}
const fail = (status: number, message: string) =>
  Object.assign(new Error('x'), { isAxiosError: true, response: { status, data: { message } } })

afterEach(() => vi.restoreAllMocks())

describe('partner activation', () => {
  it('activates with token + password and links to login', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true } })
    render(app('/partner/activate?token=abcdefghijk'))
    fill('Str0ng-pass!', 'Str0ng-pass!')
    expect(await screen.findByText(/account is active/i)).toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][1]).toEqual({ token: 'abcdefghijk', password: 'Str0ng-pass!' })
    expect(screen.getByRole('link', { name: 'Partner sign in' })).toHaveAttribute(
      'href',
      '/partner/login',
    )
  })
  it('blocks submit without a token', () => {
    const post = vi.spyOn(api, 'post')
    render(app('/partner/activate'))
    expect(screen.getByRole('button', { name: 'Activate account' })).toBeDisabled()
    expect(post).not.toHaveBeenCalled()
  })
  it('rejects mismatched passwords without calling the API', async () => {
    const post = vi.spyOn(api, 'post')
    render(app('/partner/activate?token=abcdefghijk'))
    fill('Str0ng-pass!', 'different-pass')
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })
  it('explains invalid/expired/used links on backend 400', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(fail(400, 'Invalid token'))
    render(app('/partner/activate?token=abcdefghijk'))
    fill('Str0ng-pass!', 'Str0ng-pass!')
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid, expired or already used/)
  })
  it('shows API failure and allows retry (no duplicate success state)', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(
      Object.assign(new Error('Network Error'), { isAxiosError: true }),
    )
    render(app('/partner/activate?token=abcdefghijk'))
    fill('Str0ng-pass!', 'Str0ng-pass!')
    expect(await screen.findByRole('alert')).toHaveTextContent(/Cannot reach/)
    expect(screen.queryByText(/account is active/i)).toBeNull()
  })
  it('toggles password visibility', () => {
    render(app('/partner/activate?token=abcdefghijk'))
    fireEvent.click(screen.getByLabelText('Show passwords'))
    expect(screen.getByLabelText(/^Password$/)).toHaveAttribute('type', 'text')
  })
})
