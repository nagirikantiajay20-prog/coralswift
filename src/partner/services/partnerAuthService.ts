import { endpoints } from '@/config/endpoints'
import { authService } from '@/features/auth/services/authService'
import type { ApiEnvelope, MeOut } from '@/features/auth/types'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import type { PartnerUser } from '@/types/auth'

export class NotAPartnerAccountError extends Error {
  constructor() {
    super('This account does not have access to the Partner Portal.')
  }
}

/**
 * Partner auth reuses the shared /auth endpoints and token plumbing (authService.login/refresh/
 * signOut). Only the session mapping differs. The backend decides eligibility: login answers a
 * generic 401 for unknown, locked, inactive or not-yet-activated accounts.
 */
export const partnerAuthService = {
  /** GET /auth/me; accepts only user_type=partner with an organization, else signs out. */
  async loadSession(): Promise<PartnerUser> {
    const me = (await api.get<ApiEnvelope<MeOut>>(endpoints.auth.me)).data.data
    if (me.user_type !== 'partner' || !me.organization) {
      await authService.signOut()
      throw new NotAPartnerAccountError()
    }
    const partner = {
      id: me.id,
      name: me.full_name,
      email: me.email,
      organizationId: me.organization.id,
      organizationName: me.organization.legal_name,
    }
    useAuthStore.getState().setPartner(partner)
    return partner
  },
}
