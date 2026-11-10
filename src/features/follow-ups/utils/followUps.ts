import {
  ENQUIRY_TYPES,
  type EnquiryRow,
  type EnquiryType,
  type FollowUp,
} from '@/features/business-enquiries/types'

/** Separate backend resources: applications are never merged with enquiries. */
export type RecordKind = 'application' | EnquiryType

/** Derived client-side: the backend stores only due_at / completed_at (no status, cancel or reschedule). */
export type FollowUpState = 'completed' | 'overdue' | 'open' | 'note'

export const followUpState = (f: FollowUp, now = Date.now()): FollowUpState =>
  f.completed_at
    ? 'completed'
    : !f.due_at
      ? 'note'
      : Date.parse(f.due_at) < now
        ? 'overdue'
        : 'open'

/** Same rule as the enquiry list's `overdue` filter: follow-up date passed and enquiry not closed. */
export const isRowOverdue = (
  r: Pick<EnquiryRow, 'status' | 'next_follow_up_at'>,
  now = Date.now(),
) => r.status !== 'closed' && !!r.next_follow_up_at && Date.parse(r.next_follow_up_at) < now

/** Backend follow-ups are INTERNAL staff records. Nothing is sent to the contact. */
export const entryLabel = (f: FollowUp) => (f.due_at ? 'Internal follow-up' : 'Internal note')

export const recordPath = (kind: RecordKind, id: string) =>
  kind === 'application'
    ? `/admin/applications/${id}`
    : kind === 'strategic'
      ? `/admin/strategic-enquiries/${id}`
      : `/admin/enquiries/${id}`

/** UX hint only; the backend authorizes every request. */
export const visibleEnquiryTypes = (canStrategic: boolean): EnquiryType[] =>
  ENQUIRY_TYPES.filter((t) => canStrategic || t !== 'strategic')

export const hideRestricted = (rows: EnquiryRow[], canStrategic: boolean) =>
  canStrategic ? rows : rows.filter((r) => r.enquiry_type !== 'strategic')

const pad = (n: number) => String(n).padStart(2, '0')
/** Local calendar day, "YYYY-MM-DD". */
export const dayKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** `from` / `to` are "YYYY-MM-DD" (either may be empty), inclusive. */
export const inDayRange = (iso: string, from: string, to: string) => {
  const k = dayKey(iso)
  return (!from || k >= from) && (!to || k <= to)
}

/** Rows with a follow-up date, grouped by local day, ascending (past days = overdue come first). */
export function groupByDay(rows: EnquiryRow[]) {
  const m = new Map<string, EnquiryRow[]>()
  for (const r of rows) {
    if (!r.next_follow_up_at) continue
    const k = dayKey(r.next_follow_up_at)
    m.set(k, [...(m.get(k) ?? []), r])
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, rs]) => ({ day, rows: rs }))
}

/** Backend list meta carries the exact total (untyped in the spec). */
export const metaTotal = (meta: Record<string, unknown> | null) => {
  const v = meta?.total ?? meta?.total_count
  return typeof v === 'number' ? v : undefined
}
