import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canAccess } from '@/config/permissions'
import { useAuthStore } from '@/store/authStore'
import { roleChangeSchema, staffInviteSchema } from '../schemas'
import { userManagementService as svc } from '../services/userManagementService'
import type { StaffOut } from '../types'
import {
  filterUsers,
  isPrivilegedChange,
  lockoutReason,
  metrics,
  roleLabel,
  statusTone,
} from '../utils/users'
import UserDetailPage from './UserDetailPage'
import UsersPage from './UsersPage'

const u = (o: Partial<StaffOut>): StaffOut => ({
  id: 'u1',
  email: 'a@x.test',
  full_name: 'Ada Admin',
  staff_role: 'super_administrator',
  status: 'active',
  mfa_enabled: true,
  last_login_at: null,
  ...o,
})
const wrap = (ui: React.ReactNode, path = '/') =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/u/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
const me = (id: string) =>
  useAuthStore.setState({
    user: { id, name: 'Me', email: 'm@x.test', role: 'super_administrator' },
  })
afterEach(() => vi.restoreAllMocks())

describe('utils', () => {
  const list = [
    u({ id: 'a', full_name: 'Zed', staff_role: 'partner_reviewer', status: 'inactive' }),
    u({ id: 'b', full_name: 'Amy' }),
  ]
  it('maps roles and statuses without inventing values', () => {
    expect(roleLabel('partner_reviewer')).toBe('Partner Reviewer')
    expect(roleLabel(null)).toBe('No role')
    expect(statusTone('active')).toBe('success')
    expect(statusTone('mystery')).toBe('neutral')
  })
  it('filters, searches and sorts', () => {
    expect(filterUsers(list, { search: '', role: 'all', status: 'all', sort: 'name' })[0]?.id).toBe(
      'b',
    )
    expect(
      filterUsers(list, { search: 'zed', role: 'all', status: 'all', sort: 'name' }),
    ).toHaveLength(1)
    expect(
      filterUsers(list, { search: '', role: 'all', status: 'inactive', sort: 'name' })[0]?.id,
    ).toBe('a')
  })
  it('counts from the whole list', () => {
    expect(metrics(list)).toEqual({
      total: 2,
      byStatus: { inactive: 1, active: 1 },
      byRole: { partner_reviewer: 1, super_administrator: 1 },
    })
  })
  it('blocks self-lockout and removing the last active super administrator', () => {
    const all = [u({ id: 'me' }), u({ id: 'x', staff_role: 'partner_reviewer' })]
    expect(lockoutReason(all[0]!, 'me', all, 'deactivate')).toMatch(/own account/)
    expect(lockoutReason(all[0]!, 'me', all, 'role')).toMatch(/own role/)
    expect(lockoutReason(all[0]!, 'other', all, 'role')).toMatch(/only active Super/)
    expect(lockoutReason(all[1]!, 'me', all, 'role')).toBeNull()
  })
  it('flags super administrator grants/removals as privileged', () => {
    expect(isPrivilegedChange('partner_reviewer', 'super_administrator')).toBe(true)
    expect(isPrivilegedChange('super_administrator', 'partner_reviewer')).toBe(true)
    expect(isPrivilegedChange('partner_reviewer', 'content_administrator')).toBe(false)
  })
})

describe('validation', () => {
  it('validates the invite form against StaffInviteIn', () => {
    const ok = { full_name: 'A', email: 'a@x.test', role: 'partner_reviewer' }
    expect(staffInviteSchema.safeParse(ok).success).toBe(true)
    expect(staffInviteSchema.safeParse({ ...ok, email: 'nope' }).success).toBe(false)
    expect(staffInviteSchema.safeParse({ ...ok, full_name: 'x'.repeat(151) }).success).toBe(false)
    expect(staffInviteSchema.safeParse({ ...ok, role: 'root' }).success).toBe(false)
  })
  it('rejects unchanged and unknown roles', () => {
    const s = roleChangeSchema('partner_reviewer')
    expect(s.safeParse({ role: 'partner_reviewer' }).success).toBe(false)
    expect(s.safeParse({ role: 'root' }).success).toBe(false)
    expect(s.safeParse({ role: 'content_administrator' }).success).toBe(true)
  })
})

describe('route access (UX hint)', () => {
  it('only the super administrator sees the users and roles modules', () => {
    expect(canAccess('super_administrator', 'users')).toBe(true)
    for (const r of [
      'business_development_manager',
      'partner_reviewer',
      'content_administrator',
    ] as const) {
      expect(canAccess(r, 'users')).toBe(false)
      expect(canAccess(r, 'roles')).toBe(false)
    }
  })
})

describe('pages', () => {
  it('lists administrators and shows metrics from the full list', async () => {
    vi.spyOn(svc, 'list').mockResolvedValue([
      u({}),
      u({ id: 'u2', full_name: 'Bo', status: 'inactive' }),
    ])
    wrap(<UsersPage />)
    expect(await screen.findByRole('link', { name: 'Ada Admin' })).toBeInTheDocument()
    expect(screen.getByText('Total administrators').parentElement).toHaveTextContent('2')
  })
  it('surfaces a 403 as a permission message', async () => {
    vi.spyOn(svc, 'list').mockRejectedValue(
      Object.assign(new Error('x'), { isAxiosError: true, response: { status: 403, data: {} } }),
    )
    wrap(<UsersPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Only Super Administrators/)
  })
  it('detail: own account cannot be deactivated or re-roled; no fabricated history', async () => {
    me('u1')
    vi.spyOn(svc, 'list').mockResolvedValue([
      u({}),
      u({ id: 'u2', staff_role: 'partner_reviewer' }),
    ])
    vi.spyOn(svc, 'activity').mockResolvedValue([])
    wrap(<UserDetailPage />, '/u/u1')
    expect(await screen.findByText('You cannot change your own role.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeDisabled()
    expect(
      await screen.findByText('No audit events found for this administrator'),
    ).toBeInTheDocument()
  })
  it('detail: role change needs confirmation before calling the backend', async () => {
    me('u1')
    vi.spyOn(svc, 'list').mockResolvedValue([
      u({}),
      u({ id: 'u2', staff_role: 'partner_reviewer' }),
    ])
    vi.spyOn(svc, 'activity').mockResolvedValue([])
    const set = vi.spyOn(svc, 'setRole').mockResolvedValue(null)
    wrap(<UserDetailPage />, '/u/u2')
    fireEvent.change(await screen.findByLabelText('New role'), {
      target: { value: 'super_administrator' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Change role' }))
    expect(set).not.toHaveBeenCalled()
    expect(
      await screen.findByText(/grants or removes full Super Administrator access/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Change role' }).at(-1)!)
    await waitFor(() => expect(set).toHaveBeenCalledWith('u2', 'super_administrator'))
  })
  it('detail: unknown id shows not found', async () => {
    vi.spyOn(svc, 'list').mockResolvedValue([u({})])
    wrap(<UserDetailPage />, '/u/zzz')
    expect(await screen.findByText('Administrator not found')).toBeInTheDocument()
  })
})
