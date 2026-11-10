import { dayKey } from '@/features/follow-ups/utils/followUps'
import { metaTotal } from '@/features/partner-management/utils/partners'
import { inRange, type ResolvedRange } from './range'

/** Rows per local calendar day, ascending, restricted to the range. */
export function bucketByDay<T>(rows: T[], when: (r: T) => string | null, range: ResolvedRange) {
  const m = new Map<string, number>()
  for (const r of rows) {
    const at = when(r)
    if (!at || !inRange(at, range)) continue
    const k = dayKey(at)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value }))
}

/** Counts per key, largest first. A null/empty key is grouped under `empty`. */
export function groupCount<T>(rows: T[], key: (r: T) => string | null, empty = 'Unassigned') {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = key(r) || empty
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
}

export interface Fetched<T> {
  rows: T[]
  /** Backend-reported total; undefined when the backend did not report one. */
  total?: number
  /** True when `rows` is NOT the complete dataset: totals must never be derived from it. */
  partial: boolean
}

export const PAGE = 100
export const MAX_PAGES = 5

/** Pages through a list until the reported total is reached or `maxPages` is hit. */
export async function fetchAll<T>(
  page: (p: number) => Promise<{ rows: T[]; meta: Record<string, unknown> | null }>,
  maxPages = MAX_PAGES,
): Promise<Fetched<T>> {
  const rows: T[] = []
  let total: number | undefined
  let done = false
  for (let p = 1; p <= maxPages && !done; p++) {
    const r = await page(p)
    rows.push(...r.rows)
    total = metaTotal(r.meta) ?? total
    done = r.rows.length < PAGE || (total !== undefined && rows.length >= total)
  }
  return { rows, total, partial: !done }
}
