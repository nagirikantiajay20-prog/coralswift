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
/** Safety ceiling (5,000 rows). Beyond it `partial` is true and the UI says so. */
export const MAX_PAGES = 50

const CONCURRENCY = 5

const idOf = (r: unknown): string | undefined => {
  const id = (r as { id?: unknown } | null)?.id
  return typeof id === 'string' ? id : undefined
}

/**
 * Pages through a list. Page 1 reveals the backend total; the remaining pages are then fetched
 * in parallel batches (not one by one). Rows with a repeated string `id` (records shifting
 * between pages while paging) are kept once. If any page fails the whole call rejects: a
 * half-loaded dataset is never returned as if it were complete.
 *
 * `partial` is true when the result is known or suspected to be missing records: the safety
 * ceiling (`maxPages` x PAGE) cut the list short, or fewer unique rows arrived than the total.
 * Without a reported total the pages are fetched sequentially until a short page ends the list.
 */
export async function fetchAll<T>(
  page: (p: number) => Promise<{ rows: T[]; meta: Record<string, unknown> | null }>,
  maxPages = MAX_PAGES,
): Promise<Fetched<T>> {
  const first = await page(1)
  const total = metaTotal(first.meta)
  const batches: T[][] = [first.rows]
  let reachedEnd = first.rows.length < PAGE
  if (!reachedEnd && total !== undefined) {
    const last = Math.min(maxPages, Math.ceil(total / PAGE))
    for (let from = 2; from <= last; from += CONCURRENCY) {
      const ps = Array.from({ length: Math.min(CONCURRENCY, last - from + 1) }, (_, i) => from + i)
      batches.push(...(await Promise.all(ps.map(async (p) => (await page(p)).rows))))
    }
  } else if (!reachedEnd) {
    for (let p = 2; p <= maxPages && !reachedEnd; p++) {
      const r = await page(p)
      batches.push(r.rows)
      reachedEnd = r.rows.length < PAGE
    }
  }
  const seen = new Set<string>()
  const rows = batches.flat().filter((r) => {
    const id = idOf(r)
    if (id === undefined) return true
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  const partial = total !== undefined ? rows.length < total : !reachedEnd
  return { rows, total, partial }
}
