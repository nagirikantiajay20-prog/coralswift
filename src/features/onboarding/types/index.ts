import type { PortalStatus } from '@/features/partner-applications/types'

/**
 * The backend has NO onboarding endpoints (openapi.json, 2026-11-09). Onboarding is the PRD
 * evaluation stage `pilot_onboarding`, followed by `scale_up`; both are reached through
 * POST /reviewer/applications/{id}/transition. "Approved applicants" = applications in these stages.
 */
export const APPROVED_STATUSES: PortalStatus[] = ['pilot_onboarding', 'scale_up']

/** Linear evaluation pipeline for the progress tracker (order from the PortalStatus enum). */
export const PIPELINE: PortalStatus[] = [
  'submitted',
  'eligibility_verification',
  'capability_review',
  'commercial_legal_review',
  'pilot_onboarding',
  'scale_up',
]

/** POST /api/v1/reviewer/invitations (InvitationIn). */
export interface InviteBody {
  email: string
  full_name: string
  organization_id: string
}
