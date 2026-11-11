import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { AllFollowUps } from './AllFollowUps'

const fu = {
  id: 'f1',
  enquiry_id: 'e1',
  enquiry_reference: 'ENQ-1',
  note: 'Call back',
  due_at: '2026-12-01T10:00:00Z',
  completed_at: null,
  kind: 'follow_up',
  status: 'open',
  assignee_id: 'u1',
  assignee_name: 'Ann',
}
const staff = [
  { id: 'u1', full_name: 'Ann' },
  { id: 'u2', full_name: 'Bob' },
]
const route = (list: unknown[] = [fu]) =>
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url.includes('/admin/follow-ups')) return { data: { data: list, meta: { total: list.length } } } as never
    return { data: { data: staff } } as never
  })
const view = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <AllFollowUps />
      </MemoryRouter>
    </QueryClientProvider>,
  )
afterEach(() => vi.restoreAllMocks())

describe('AllFollowUps edit', () => {
  it('sends only the changed fields to PATCH', async () => {
    route()
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { data: fu } } as never)
    view()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.change(await screen.findByDisplayValue('Call back'), { target: { value: 'Call back Monday' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/api/v1/admin/enquiries/e1/follow-ups/f1', {
        note: 'Call back Monday',
      }),
    )
  })

  it('reassigns and clears the due date using null', async () => {
    route()
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { data: fu } } as never)
    view()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    await screen.findByRole('option', { name: 'Bob' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Assignee' }), { target: { value: 'u2' } })
    fireEvent.click(screen.getByLabelText('Clear due date'))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/api/v1/admin/enquiries/e1/follow-ups/f1', {
        assignee_id: 'u2',
        due_at: null,
      }),
    )
  })

  it('unassigns with a null assignee_id', async () => {
    route()
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { data: fu } } as never)
    view()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    await screen.findByRole('option', { name: 'Bob' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Assignee' }), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/api/v1/admin/enquiries/e1/follow-ups/f1', {
        assignee_id: null,
      }),
    )
  })

  it('sends nothing when nothing changed, and blocks an empty or over-long note', async () => {
    route()
    const patch = vi.spyOn(api, 'patch')
    view()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const note = await screen.findByDisplayValue('Call back')
    fireEvent.change(note, { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    fireEvent.change(note, { target: { value: 'x'.repeat(4001) } })
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    fireEvent.change(note, { target: { value: 'Call back' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(patch).not.toHaveBeenCalled()
  })

  it('shows the backend error and keeps the list when the update is rejected', async () => {
    route()
    vi.spyOn(api, 'patch').mockRejectedValue(new Error('conflict'))
    view()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.change(await screen.findByDisplayValue('Call back'), { target: { value: 'New' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.patch).toHaveBeenCalled())
    expect(await screen.findByText('Call back')).toBeInTheDocument()
  })

  it('offers no edit for a completed follow-up', async () => {
    route([{ ...fu, status: 'completed' }])
    view()
    await screen.findByText('Call back')
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  })
})
