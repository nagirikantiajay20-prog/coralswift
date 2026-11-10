import { describe, expect, it } from 'vitest'
import { bucketByDay, fetchAll, groupCount, PAGE } from './aggregate'
import { inRange, resolveRange } from './range'

const now = new Date(2026, 10, 10, 15, 30) // 10 Nov 2026, local time

describe('resolveRange', () => {
  it('uses local day boundaries', () => {
    const r = resolveRange('today', '', '', now)
    expect(new Date(r.from!).getHours()).toBe(0)
    expect(new Date(r.to!).getHours()).toBe(23)
    expect(new Date(r.to!).getMilliseconds()).toBe(999)
  })
  it('last 7 days = today + 6 prior days', () => {
    expect(new Date(resolveRange('7d', '', '', now).from!).getDate()).toBe(4)
  })
  it('previous month spans the whole month', () => {
    const r = resolveRange('prev_month', '', '', now)
    expect(new Date(r.from!).getMonth()).toBe(9)
    expect(new Date(r.from!).getDate()).toBe(1)
    expect(new Date(r.to!).getDate()).toBe(31)
  })
  it('validates custom ranges', () => {
    expect(resolveRange('custom', '2026-11-10', '2026-11-01').error).toBeTruthy()
    expect(resolveRange('custom', '2026-02-31', '').error).toBeTruthy()
    expect(resolveRange('custom', '2026-11-01', '2026-11-01').error).toBeUndefined()
  })
  it('inRange includes the whole last local day and excludes the next', () => {
    const r = resolveRange('custom', '2026-11-01', '2026-11-01')
    expect(inRange(new Date(2026, 10, 1, 23, 59).toISOString(), r)).toBe(true)
    expect(inRange(new Date(2026, 10, 2, 0, 0).toISOString(), r)).toBe(false)
  })
})

describe('aggregation', () => {
  it('buckets by local day inside the range only', () => {
    const rows = [new Date(2026, 10, 1, 9), new Date(2026, 10, 1, 20), new Date(2026, 9, 1)].map(
      (d) => ({ at: d.toISOString() }),
    )
    const out = bucketByDay(rows, (r) => r.at, resolveRange('custom', '2026-11-01', '2026-11-30'))
    expect(out).toEqual([{ day: '2026-11-01', value: 2 }])
  })
  it('groups with an Unassigned bucket, largest first', () => {
    const out = groupCount([{ a: 'x' }, { a: null }, { a: null }], (r) => r.a)
    expect(out).toEqual([
      { name: 'Unassigned', value: 2 },
      { name: 'x', value: 1 },
    ])
  })
  it('flags a truncated dataset as partial', async () => {
    const r = await fetchAll(async () => ({ rows: Array(PAGE).fill(0), meta: { total: 450 } }), 2)
    expect(r.rows.length).toBe(200)
    expect(r.total).toBe(450)
    expect(r.partial).toBe(true)
  })
  it('is complete when rows reach the reported total', async () => {
    const r = await fetchAll(async () => ({ rows: [1, 2], meta: { total: 2 } }))
    expect(r.partial).toBe(false)
  })
})
