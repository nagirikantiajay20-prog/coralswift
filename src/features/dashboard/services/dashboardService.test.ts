import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api/client'
import { dashboardService } from './dashboardService'

const rows = (n: number, from: number) => Array.from({ length: n }, (_, i) => ({ id: `e${from + i}` }))
const pageOf = (cfg: unknown) => (cfg as { params: { page: number } }).params.page
afterEach(() => vi.restoreAllMocks())

describe('dashboardService list loading', () => {
  it('pages enquiries with the date range and returns a complete result', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation(async (_u, cfg) => {
      const p = pageOf(cfg)
      return { data: { data: p < 3 ? rows(100, (p - 1) * 100) : rows(20, 200), meta: { total: 220 } } }
    })
    const f = await dashboardService.enquiries({ from: '2026-11-01T00:00:00Z', to: undefined })
    expect(f.rows).toHaveLength(220)
    expect(f.partial).toBe(false)
    expect(get).toHaveBeenCalledTimes(3)
    expect(get.mock.calls[0][1]?.params).toMatchObject({
      created_from: '2026-11-01T00:00:00Z',
      page_size: 100,
    })
  })

  it('reports an empty list as complete', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: null, meta: { total: 0 } } })
    expect(await dashboardService.applications()).toEqual({ rows: [], total: 0, partial: false })
  })

  it('marks partners partial at the 5,000-row ceiling instead of hiding it', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation(async (_u, cfg) => ({
      data: { data: rows(100, (pageOf(cfg) - 1) * 100), meta: { total: 9000 } },
    }))
    const f = await dashboardService.activeOrganizations()
    expect(f.rows).toHaveLength(5000)
    expect(f.partial).toBe(true)
    expect(get).toHaveBeenCalledTimes(50)
  })

  it('propagates an API failure', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('down'))
    await expect(dashboardService.enquiries({})).rejects.toThrow('down')
  })
})
