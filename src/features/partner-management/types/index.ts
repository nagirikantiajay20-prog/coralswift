import type { ApiList, OrgRow } from '@/features/dashboard/types'
import type { Organization } from '@/features/partner-applications/types'

export type { ApiList, OrgRow }

/** Backend `OrgStatusIn.status` pattern: ^(active|suspended)$ . No other statuses exist in the spec. */
export const ORG_STATUSES = ['active', 'suspended'] as const
export type OrgStatus = (typeof ORG_STATUSES)[number]

export interface ListParams {
  q?: string
  status?: OrgStatus
  page: number
  page_size: number
}

/** Application link on a partner profile; all but id optional (the detail response is an untyped dict). */
export interface PartnerApplicationLink {
  id: string
  reference?: string
  status?: string
  pathway?: string
  submitted_at?: string | null
}

/** Only keys shared with OrgRow/Organization are read; every one may be absent. */
export interface PartnerDetail {
  org: Partial<Organization> & { id: string }
  applications: PartnerApplicationLink[]
}

export interface StatusBody {
  status: OrgStatus
  reason: string
}
