import type { ApiList } from '@/features/dashboard/types'

export type { ApiList }

/** Backend `AuditRow` (GET /admin/audit, super administrator). No outcome, IP, device, actor name or before/after fields exist; `meta` is free-form. */
export interface AuditRowRaw {
  id: string
  record_type: string
  record_id: string
  action: string
  actor_type: string
  actor_user_id: string | null
  organization_id: string | null
  request_id: string | null
  meta: Record<string, unknown> | null
  created_at: string
  /** Server-resolved actor name and strategic flag (2026-11 contract); absent on older payloads. */
  actor_name?: string | null
  is_strategic?: boolean
}

/** Sanitised view model. Secrets are redacted at mapping time; restricted rows carry no content. */
export interface AuditEntry {
  id: string
  at: string
  action: string
  recordType: string
  recordId: string
  actorType: string
  actorUserId: string | null
  actorName: string | null
  organizationId: string | null
  requestId: string | null
  meta: Record<string, unknown>
  /** Strategic/M&A content withheld because the role lacks strategic access. */
  restricted: boolean
}

export interface AuditFilters {
  action: string
  recordType: string
  actorUserId: string
  from?: string
  to?: string
}
