import { reviewEndpoints as e } from '@/config/endpoints'
import { partnerApplicationsService } from '@/features/partner-applications/services/partnerApplicationsService'
import { api } from '@/services/api/client'
import { APPROVED_STATUSES, type InviteBody } from '../types'

/** Onboarding reuses the verified reviewer application API; only the invitation call is new. */
export const onboardingService = {
  /** Applications in the onboarding stages (backend max page_size 100 per status). */
  listApproved: async () => {
    const pages = await Promise.all(
      APPROVED_STATUSES.map((status) =>
        partnerApplicationsService.list({ status, page: 1, page_size: 100 }),
      ),
    )
    return {
      rows: pages.flatMap((p) => p.rows),
      truncated: pages.some((p) => p.rows.length >= 100),
    }
  },
  invitePartner: (body: InviteBody) => api.post(e.invitePartner, body),
}
