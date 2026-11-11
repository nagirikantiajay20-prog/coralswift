import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import { auditLogsService } from '../services/auditLogsService'
import { useAuditSample } from './useAudit'

const raw = (id: string) => ({
  id,
  record_type: 'enquiry',
  record_id: 'r',
  action: 'enquiry.update',
  actor_type: 'user',
  actor_user_id: 'u1',
  organization_id: null,
  request_id: null,
  created_at: '2026-11-01T00:00:00Z',
  meta: {},
})
const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)
afterEach(() => vi.restoreAllMocks())

describe('useAuditSample', () => {
  useAuthStore.setState({
    user: { id: 'u1', name: 'A', email: 'a@x.test', role: 'super_administrator' },
  })

  it('loads every page and is not partial when all events arrive', async () => {
    const list = vi.spyOn(auditLogsService, 'list').mockImplementation(async (_f, page) => ({
      rows: Array.from({ length: page < 3 ? 100 : 50 }, (_, i) => raw(`a${page}-${i}`)) as never,
      meta: { total: 250 },
    }))
    const { result } = renderHook(() => useAuditSample(), { wrapper: wrap })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({ partial: false })
    expect(result.current.data?.entries).toHaveLength(250)
    expect(list).toHaveBeenCalledTimes(3)
  })

  it('flags the breakdown partial when the ceiling cuts the events short', async () => {
    vi.spyOn(auditLogsService, 'list').mockImplementation(async (_f, page) => ({
      rows: Array.from({ length: 100 }, (_, i) => raw(`b${page}-${i}`)) as never,
      meta: { total: 8000 },
    }))
    const { result } = renderHook(() => useAuditSample(), { wrapper: wrap })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.partial).toBe(true)
    expect(result.current.data?.entries).toHaveLength(5000)
  })

  it('surfaces an API failure instead of an empty breakdown', async () => {
    vi.spyOn(auditLogsService, 'list').mockRejectedValue(new Error('403'))
    const { result } = renderHook(() => useAuditSample(), { wrapper: wrap })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
