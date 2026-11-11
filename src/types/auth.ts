import type { Role } from '@/config/permissions'

/** Partner session user. Identity and organization come from GET /auth/me, never from the browser. */
export interface PartnerUser {
  id: string
  name: string
  email: string
  organizationId: string
  organizationName: string
}

/** Which portal a session belongs to; derived from the backend's /auth/me, never chosen by the user. */
export type SessionKind = 'staff' | 'partner'

/** Minimal session user. Real backend user shape is pending API documentation. */
export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
}
