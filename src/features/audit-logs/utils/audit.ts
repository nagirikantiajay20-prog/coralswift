import type { AuditEntry, AuditRowRaw } from '../types'

const SECRET_KEY =
  /pass(word|wd)?|secret|token|api[_-]?key|authorization|credential|otp|totp|recovery|ssn|card|cvv|private|signature/i
const STRATEGIC = /strategic|m&a|merger|acquisition/i
export const REDACTED = '[redacted]'

/** Recursively masks values stored under secret-looking keys. Depth-limited; never throws. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        SECRET_KEY.test(k) ? REDACTED : redact(v, depth + 1),
      ]),
    )
  }
  return value
}

/** Backend marks no audit row as strategic: this is a heuristic, backend access control stays authoritative. */
export const looksStrategic = (r: Pick<AuditRowRaw, 'record_type' | 'action' | 'meta'>) => {
  let m = ''
  try {
    m = JSON.stringify(r.meta ?? {})
  } catch {
    /* unserialisable meta: ignore */
  }
  return STRATEGIC.test(`${r.record_type} ${r.action} ${m}`)
}

export function toEntry(r: AuditRowRaw, canSeeStrategic: boolean): AuditEntry {
  const restricted = !canSeeStrategic && looksStrategic(r)
  return {
    id: r.id,
    at: r.created_at,
    action: restricted ? 'Restricted' : r.action,
    recordType: restricted ? 'Restricted' : r.record_type,
    recordId: restricted ? '' : r.record_id,
    actorType: r.actor_type,
    actorUserId: r.actor_user_id,
    organizationId: restricted ? null : r.organization_id,
    requestId: r.request_id,
    meta: restricted ? {} : (redact(r.meta ?? {}) as Record<string, unknown>),
    restricted,
  }
}

/** Client-side text search over the loaded page only (the backend has no `q`). */
export const searchEntries = (
  rows: AuditEntry[],
  q: string,
  actorName: (id: string | null) => string,
) => {
  const s = q.trim().toLowerCase()
  if (!s) return rows
  return rows.filter((e) =>
    [e.action, e.recordType, e.recordId, e.actorType, actorName(e.actorUserId), e.requestId ?? '']
      .join(' ')
      .toLowerCase()
      .includes(s),
  )
}

/** Counts by key over loaded rows, most frequent first. */
export function countBy<T>(rows: T[], key: (r: T) => string | null) {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = key(r)
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
}

/** Local-day start as ISO, for the "today" count. */
export const startOfToday = (now = new Date()) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

/** Local date input ("YYYY-MM-DD") -> ISO instant at local day start/end. Empty/invalid -> undefined. */
export function dayBound(day: string, end: boolean): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!m) return undefined
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  if (d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return undefined // rollover, e.g. 02-31
  if (end) d.setDate(d.getDate() + 1)
  return new Date(d.getTime() - (end ? 1 : 0)).toISOString()
}
