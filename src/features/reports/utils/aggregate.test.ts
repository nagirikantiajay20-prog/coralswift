import { describe, expect, it, vi } from 'vitest'
import { fetchAll, MAX_PAGES, PAGE } from './aggregate'

type Row = { id: string }
const rows = (from: number, n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: `r${from + i}` }))

/** Backend double: `total` records served PAGE per page, optional per-page override. */
const backend = (total: number | undefined, over: Record<number, () => Promise<never>> = {}) =>
  vi.fn(async (p: number) => {
    if (over[p]) return over[p]()
    const start = (p - 1) * PAGE
    return {
      rows: rows(start, Math.max(0, Math.min(PAGE, (total ?? 0) - start))),
      meta: total === undefined ? null : { total },
    }
  })

describe('fetchAll', () => {
  it('returns an empty, complete result for an empty list', async () => {
    const page = backend(0)
    const r = await fetchAll(page)
    expect(r).toEqual({ rows: [], total: 0, partial: false })
    expect(page).toHaveBeenCalledTimes(1)
  })

  it('retrieves every page once and in order', async () => {
    const page = backend(250)
    const r = await fetchAll(page)
    expect(r.rows.map((x) => x.id)).toEqual(rows(0, 250).map((x) => x.id))
    expect(r.partial).toBe(false)
    expect(page.mock.calls.map((c) => c[0]).sort()).toEqual([1, 2, 3])
  })

  it('requests the remaining pages concurrently, not one after another', async () => {
    let inFlight = 0
    let peak = 0
    const page = vi.fn(async (p: number) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((res) => setTimeout(res, 5))
      inFlight--
      return { rows: rows((p - 1) * PAGE, PAGE), meta: { total: PAGE * 6 } }
    })
    await fetchAll(page)
    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThanOrEqual(5)
  })

  it('stops at the 5,000-record safety ceiling and flags the result partial', async () => {
    const page = backend(20_000)
    const r = await fetchAll(page)
    expect(MAX_PAGES * PAGE).toBe(5000)
    expect(r.rows).toHaveLength(5000)
    expect(r.total).toBe(20_000)
    expect(r.partial).toBe(true)
    expect(page).toHaveBeenCalledTimes(MAX_PAGES)
  })

  it('is complete when the list ends exactly at the ceiling', async () => {
    const r = await fetchAll(backend(5000))
    expect(r.rows).toHaveLength(5000)
    expect(r.partial).toBe(false)
  })

  it('removes records repeated across pages and then reports the shortfall as partial', async () => {
    // Records shifted between page requests: page 2 repeats the last row of page 1.
    const page = vi.fn(async (p: number) => ({
      rows: p === 1 ? rows(0, PAGE) : [{ id: `r${PAGE - 1}` }, ...rows(PAGE, PAGE - 1)],
      meta: { total: 2 * PAGE },
    }))
    const r = await fetchAll(page)
    expect(new Set(r.rows.map((x) => x.id)).size).toBe(r.rows.length)
    expect(r.rows).toHaveLength(2 * PAGE - 1)
    expect(r.partial).toBe(true)
  })

  it('rejects instead of returning half a dataset when a page fails', async () => {
    const page = backend(300, { 2: () => Promise.reject(new Error('503')) })
    await expect(fetchAll(page)).rejects.toThrow('503')
  })

  it('rejects when the first page fails', async () => {
    const page = backend(10, { 1: () => Promise.reject(new Error('boom')) })
    await expect(fetchAll(page)).rejects.toThrow('boom')
  })

  it('pages sequentially to a short page when the backend reports no total', async () => {
    const page = vi.fn(async (p: number) => ({
      rows: p < 3 ? rows((p - 1) * PAGE, PAGE) : rows(2 * PAGE, 7),
      meta: null,
    }))
    const r = await fetchAll(page)
    expect(r.rows).toHaveLength(2 * PAGE + 7)
    expect(r.total).toBeUndefined()
    expect(r.partial).toBe(false)
  })

  it('flags partial when no total is reported and the ceiling cuts the list', async () => {
    const page = vi.fn(async (p: number) => ({ rows: rows((p - 1) * PAGE, PAGE), meta: null }))
    const r = await fetchAll(page, 3)
    expect(r.rows).toHaveLength(300)
    expect(r.partial).toBe(true)
  })

  it('treats a row count below the reported total as partial', async () => {
    const r = await fetchAll(async () => ({ rows: rows(0, 2), meta: { total: 9 } }))
    expect(r.partial).toBe(true)
  })
})
