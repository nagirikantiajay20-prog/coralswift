import type { ApiList } from '@/features/dashboard/types'

export type { ApiList }

/** Backend `AuditRow` (GET /admin/audit). `meta` is deliberately not mapped: it may hold sensitive data. */
export interface AuditRow {
  id: string
  record_type: string
  record_id: string
  action: string
  actor_type: string
  actor_user_id: string | null
  organization_id: string | null
  created_at: string
}

export interface AccountEvent {
  id: string
  action: string
  recordType: string
  recordId: string
  actorType: string
  actorUserId: string | null
  at: string
}

export interface Capability {
  operation: string
  support: 'verified' | 'missing'
  detail: string
}

/** Backend `AccountOut` (GET /admin/accounts, openapi 2026-11-10). */
export interface AccountRow {
  id: string
  email: string
  full_name: string
  user_type: 'partner' | 'staff'
  status: 'invited' | 'active' | 'deactivated'
  invitation_state: string
  /** Email delivery of the invitation (pending|sent|logged|failed); NOT account activation. */
  invitation_delivery_status?: string | null
  invitation_delivery_at?: string | null
  mfa_enabled: boolean
  last_login_at: string | null
  created_at: string
  organization: { id: string; legal_name: string } | null
}

/** Backend `AccountDetail` (GET /admin/accounts/{user_id}): AccountOut plus recent activity. */
export interface AccountDetail extends AccountRow {
  recent_activity: { action: string; actor_name: string | null; created_at: string }[]
}
