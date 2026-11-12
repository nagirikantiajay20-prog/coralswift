import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canAccess } from '@/config/permissions'
import { settingSchema } from '@/features/settings/schemas'
import { settingsService } from '@/features/settings/services/settingsService'
import SettingsPage from '@/features/settings/pages/SettingsPage'
import { displayValue, normalizeSettings } from '@/features/settings/utils/settings'
import { api } from '@/services/api/client'
import { auditLogsService } from '../services/auditLogsService'
import type { AuditRowRaw } from '../types'
import { countBy, dayBound, redact, searchEntries, toEntry } from '../utils/audit'
import AuditLogDetailPage from './AuditLogDetailPage'
import AuditLogsPage from './AuditLogsPage'

const row = (o: Partial<AuditRowRaw> = {}): AuditRowRaw => ({
  id: 'e1',
  record_type: 'organization',
  record_id: '11111111-2222',
  action: 'status_changed',
  actor_type: 'staff',
  actor_user_id: 'u1',
  organization_id: null,
  request_id: 'req-1',
  meta: { reason: 'ok', password: 'hunter2', nested: { api_key: 'k', fine: 1 } },
  created_at: '2026-11-10T10:00:00Z',
  ...o,
})
const wrap = (ui: React.ReactNode, entries: unknown[] = ['/']) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={entries as never}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
afterEach(() => vi.restoreAllMocks())

describe('audit utils', () => {
  it('redacts secrets recursively', () => {
    const m = redact(row().meta) as Record<string, Record<string, unknown>>
    expect(m.password).toBe('[redacted]')
    expect(m.nested.api_key).toBe('[redacted]')
    expect(m.nested.fine).toBe(1)
  })
  it('withholds strategic events without strategic access', () => {
    const r = row({ record_type: 'strategic_enquiry', action: 'viewed', is_strategic: true })
    const hidden = toEntry(r, false)
    expect(hidden.restricted).toBe(true)
    expect(hidden.recordId).toBe('')
    expect(hidden.meta).toEqual({})
    expect(toEntry(r, true).restricted).toBe(false)
  })
  it('searches, counts and bounds dates', () => {
    const rows = [toEntry(row(), true), toEntry(row({ id: 'e2', action: 'login' }), true)]
    expect(searchEntries(rows, 'login', () => 'x')).toHaveLength(1)
    expect(searchEntries(rows, 'ada', () => 'Ada')).toHaveLength(2)
    expect(countBy(rows, (r) => r.recordType)[0]).toEqual({ name: 'organization', count: 2 })
    expect(dayBound('2026-02-31', false)).toBeUndefined()
    expect(dayBound('', true)).toBeUndefined()
    expect(new Date(dayBound('2026-11-10', true)!) > new Date(dayBound('2026-11-10', false)!)).toBe(
      true,
    )
  })
})

describe('audit pages', () => {
  it('lists events read-only, passes filters and masks metadata on detail', async () => {
    const list = vi
      .spyOn(auditLogsService, 'list')
      .mockResolvedValue({ rows: [row()], meta: { total: 1 } })
    vi.spyOn(auditLogsService, 'count').mockResolvedValue(42)
    wrap(<AuditLogsPage />)
    expect(await screen.findByText('Status changed')).toBeInTheDocument()
    expect(screen.getAllByText('42').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /delete|edit/i })).toBeNull()
    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'login' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }))
    await waitFor(() =>
      expect(list).toHaveBeenCalledWith(expect.objectContaining({ action: 'login' }), 1),
    )
  })
  it('blocks an inverted date range', async () => {
    vi.spyOn(auditLogsService, 'list').mockResolvedValue({ rows: [], meta: null })
    vi.spyOn(auditLogsService, 'count').mockResolvedValue(0)
    wrap(<AuditLogsPage />)
    fireEvent.change(await screen.findByLabelText('From date'), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-11-01' } })
    expect(screen.getByRole('button', { name: 'Apply filters' })).toBeDisabled()
  })
  it('shows an error with retry and a 403 permission state', async () => {
    vi.spyOn(auditLogsService, 'count').mockResolvedValue(0)
    vi.spyOn(auditLogsService, 'list').mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { message: 'no' } },
    })
    wrap(<AuditLogsPage />)
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
  })
  it('detail page shows redacted metadata, no edit actions, and handles a cold open', () => {
    const entry = toEntry(row(), true)
    wrap(<AuditLogDetailPage />, [{ pathname: '/x', state: { entry } }])
    expect(screen.getAllByText('[redacted]', { exact: false }).length).toBeGreaterThan(0)
    expect(screen.queryByText('hunter2')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('detail page opened cold fetches the event by id and applies the strategic gate', async () => {
    const get = vi
      .spyOn(auditLogsService, 'get')
      .mockResolvedValue(row({ id: 'e9', actor_name: 'Asha Rao', is_strategic: true }))
    wrap(
      <Routes>
        <Route path="/audit-logs/:id" element={<AuditLogDetailPage />} />
      </Routes>,
      ['/audit-logs/e9'],
    )
    await waitFor(() => expect(get).toHaveBeenCalledWith('e9'))
    expect(await screen.findByText(/withheld for your role/)).toBeInTheDocument()
    expect(screen.getByText('Asha Rao')).toBeInTheDocument()
  })
  it('detail page without state or id does not fabricate an event', () => {
    wrap(<AuditLogDetailPage />)
    expect(screen.getByText('Event not loaded')).toBeInTheDocument()
  })
})

describe('settings', () => {
  it('normalises supported shapes without inventing keys', () => {
    expect(
      normalizeSettings({ stored: { a: 'x' }, keys: ['a', 'b'] }).items.map((i) => i.key),
    ).toEqual(['a', 'b'])
    expect(normalizeSettings({ site_name: 'Coral' }).items[0]).toMatchObject({
      key: 'site_name',
      value: 'Coral',
      stored: true,
    })
    expect(normalizeSettings({ stored: {}, other: [1] }).items).toEqual([])
    expect(normalizeSettings(null).items).toEqual([])
  })
  it('masks credential-like values', () => {
    const [i] = normalizeSettings({ smtp_password: 'secret!' }).items
    expect(i.sensitive).toBe(true)
    expect(displayValue(i)).not.toContain('secret')
  })
  it('validates against SettingIn', () => {
    expect(settingSchema.safeParse({ value: '   ' }).success).toBe(false)
    expect(settingSchema.safeParse({ value: 'a'.repeat(201) }).success).toBe(false)
    expect(settingSchema.safeParse({ value: ' ok ' })).toMatchObject({
      success: true,
      data: { value: 'ok' },
    })
  })
  it('is only reachable by super administrators (frontend hint)', () => {
    for (const m of ['auditLogs', 'settings'] as const) {
      expect(canAccess('super_administrator', m)).toBe(true)
      expect(canAccess('business_development_manager', m)).toBe(false)
      expect(canAccess('content_administrator', m)).toBe(false)
    }
  })
  it('requires review before saving and reports backend failure', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: { stored: { site_name: 'Coral' } } } })
    const put = vi.spyOn(settingsService, 'put').mockRejectedValue(new Error('boom'))
    wrap(<SettingsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit site_name' }))
    fireEvent.change(screen.getByLabelText('New value'), { target: { value: 'Coral Swift' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review change' }))
    expect(await screen.findByText('Proposed value')).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and save' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('site_name', 'Coral Swift'))
  })
  it('shows a permission message on 403', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { message: 'Forbidden' } },
    })
    wrap(<SettingsPage />)
    expect(await screen.findByText(/do not have permission/i)).toBeInTheDocument()
  })
})
