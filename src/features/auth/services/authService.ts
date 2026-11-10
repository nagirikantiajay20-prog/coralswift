import { endpoints } from '@/config/endpoints'
import { STAFF_ROLE_TO_ROLE } from '@/config/permissions'
import { api, requireEndpoint } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import type { SessionUser } from '@/types/auth'
import type { ChangePasswordValues } from '../schemas'
import type { ApiEnvelope, MeOut, MfaEnrollOut, TokenOut } from '../types'

const e = endpoints.auth
const data = <T>(r: { data: ApiEnvelope<T> }) => r.data.data

export class NotAStaffAccountError extends Error {
  constructor() {
    super('This account does not have access to the Admin Console.')
  }
}

/** Centralised auth calls (endpoints/schemas verified against the backend OpenAPI spec). */
export const authService = {
  /** POST /auth/login. Stores tokens; resolves the MFA step still required (if any). */
  async login(values: { email: string; password: string }) {
    const t = data(await api.post<ApiEnvelope<TokenOut>>(e.login, values))
    const step = t.mfa_enrollment_required ? 'enroll' : t.mfa_required ? 'verify' : null
    useAuthStore.getState().setTokens(t.access_token, t.refresh_token, step)
    return step
  },

  /** GET /auth/me, then publish the session user. Rejects partner / role-less accounts. */
  async loadSession(): Promise<SessionUser> {
    const me = data(await api.get<ApiEnvelope<MeOut>>(e.me))
    const role =
      me.user_type === 'staff' && me.staff_role ? STAFF_ROLE_TO_ROLE[me.staff_role] : undefined
    if (!role) {
      await authService.signOut()
      throw new NotAStaffAccountError()
    }
    const user = { id: me.id, name: me.full_name, email: me.email, role }
    useAuthStore.getState().setUser(user)
    return user
  },

  async verifyMfa(input: { code: string } | { recovery_code: string }) {
    await api.post(e.mfaVerify, input)
  },
  async enrollMfa() {
    return data(await api.post<ApiEnvelope<MfaEnrollOut>>(e.mfaEnroll))
  },
  async confirmMfa(code: string) {
    return data(await api.post<ApiEnvelope<{ recovery_codes: string[] }>>(e.mfaConfirm, { code }))
  },

  /** POST /auth/refresh (one-time-use refresh token; rotated). Bypasses interceptors via fresh call. */
  async refresh(): Promise<boolean> {
    const s = useAuthStore.getState()
    if (!s.refreshToken || s.mfaStep) return false
    try {
      const t = data(
        await api.post<ApiEnvelope<TokenOut>>(e.refresh, { refresh_token: s.refreshToken }),
      )
      s.setTokens(t.access_token, t.refresh_token)
      return true
    } catch {
      return false
    }
  },

  /** POST /auth/logout revokes the server session; local state is always cleared. */
  async signOut() {
    if (useAuthStore.getState().accessToken) {
      await api.post(e.logout).catch(() => undefined)
    }
    useAuthStore.getState().clear()
  },

  async acceptInvitation(values: { token: string; password: string }) {
    await api.post(e.acceptInvitation, values)
  },

  /** Always 202 with the same answer, whether or not the account exists. */
  async forgotPassword(values: { email: string }) {
    await api.post(e.forgotPassword, values)
  },
  async resetPassword(values: { token: string; password: string }) {
    await api.post(e.resetPassword, { token: values.token, new_password: values.password })
  },
  async changePassword(values: ChangePasswordValues) {
    await api.post(requireEndpoint(e.changePassword, 'Change password'), {
      current_password: values.currentPassword,
      new_password: values.password,
    })
  },
}
