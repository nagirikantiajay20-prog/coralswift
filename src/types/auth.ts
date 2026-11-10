import type { Role } from '@/config/permissions'

/** Partner session user. Identity and organization come from GET /auth/me, never from the browser. */
export interface PartnerUser {
  id: string
  name: string
  email: string
  organizationId: string
  organizationName: string
}

/** Minimal session user. Real backend user shape is pending API documentation. */
export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
}
