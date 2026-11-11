import { isAxiosError } from 'axios'
import { endpoints } from '@/config/endpoints'
import { STAFF_ROLE_TO_ROLE } from '@/config/permissions'
import { partnerAuthService } from '@/partner/services/partnerAuthService'
import { api, requireEndpoint } from '@/services/api/client'
import { storedRefreshToken, useAuthStore } from '@/store/authStore'
import { ownedByAnotherLiveTab } from '@/store/tabOwner'
import type { SessionKind, SessionUser } from '@/types/auth'
import type { ChangePasswordValues } from '../schemas'
import type { ApiEnvelope, MeOut, MfaEnrollOut, PermissionsOut, TokenOut } from '../types'

const e = endpoints.auth
const data = <T>(r: { data: ApiEnvelope<T> }) => r.data.data

export class NotAStaffAccountError extends Error {
  constructor() {
    super('This account does not have access to the Admin Console.')
  }
}

let restoring: Promise<void> | null = null

/** No answer from the server (offline, timeout, 5xx, 429): says nothing about the token itself. */
const isTransient = (e: unknown) =>
  isAxiosError(e) && (!e.response || e.response.status >= 500 || e.response.status === 429)

/** Centralised auth calls (endpoints/schemas verified against the backend OpenAPI spec). */
export const authService = {
  /** POST /auth/login. Stores tokens; resolves the MFA step still required (if any). */
  async login(values: { email: string; password: string }) {
    const t = data(await api.post<ApiEnvelope<TokenOut>>(e.login, values))
    const step = t.mfa_enrollment_required ? 'enroll' : t.mfa_required ? 'verify' : null
    useAuthStore.getState().setTokens(t.access_token, t.refresh_token, step)
    return step
  },

  /**
   * GET /auth/me once and publish whichever session the backend says this is (staff or partner).
   * The caller never chooses the portal: user_type / staff_role from the server decide.
   */
  async completeSession(me?: MeOut): Promise<SessionKind> {
    const m = me ?? data(await api.get<ApiEnvelope<MeOut>>(e.me))
    if (m.user_type === 'partner') {
      await partnerAuthService.loadSession(m)
      return 'partner'
    }
    await authService.loadSession(m)
    return 'staff'
  },

  /** Publishes the staff session from /auth/me. Rejects partner / role-less (unknown role) accounts. */
  async loadSession(meIn?: MeOut): Promise<SessionUser> {
    const me = meIn ?? data(await api.get<ApiEnvelope<MeOut>>(e.me))
    const role =
      me.user_type === 'staff' && me.staff_role ? STAFF_ROLE_TO_ROLE[me.staff_role] : undefined
    if (!role) {
      await authService.signOut()
      throw new NotAStaffAccountError()
    }
    const user = { id: me.id, name: me.full_name, email: me.email, role }
    const perms = await authService.loadPermissions()
    useAuthStore.getState().setUser(user)
    useAuthStore.getState().setPermissions(perms.paths, perms.matrix)
    return user
  },

  /** GET /auth/permissions. Any failure or empty answer returns null so the role hint applies. */
  async loadPermissions(): Promise<{
    paths: string[] | null
    matrix: Record<string, string[]> | null
  }> {
    try {
      const d = data(await api.get<ApiEnvelope<PermissionsOut>>(e.permissions))
      const paths = (d?.modules ?? [])
        .flatMap((m) => m.endpoints)
        .filter((x) => x.method.toUpperCase() === 'GET')
        .map((x) => x.path)
      return { paths: paths.length ? paths : null, matrix: d?.role_matrix ?? null }
    } catch {
      return { paths: null, matrix: null }
    }
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
    } catch (e) {
      if (isTransient(e)) throw e // keep the session; the caller decides whether to retry
      return false // rejected / revoked / reused: the session is over
    }
  },

  /**
   * Startup: exchange the tab's stored refresh token (POST /auth/refresh) for a session, then
   * GET /auth/me decides staff vs partner. Single-flight (the token is one-time use, and
   * StrictMode mounts twice). Any failure clears the stored token: no retry loop.
   */
  restore(): Promise<void> {
    restoring ??= (async () => {
      const st = useAuthStore.getState()
      try {
        const rt = storedRefreshToken()
        if (!rt) return
        // A duplicated tab copies sessionStorage; using the one-time token twice revokes the session.
        if (await ownedByAnotherLiveTab()) {
          st.clear() // this tab only: nothing is sent to the server
          return
        }
        st.setTokens('', rt) // lets refresh() read the token; replaced on success
        if (!(await authService.refresh())) throw new Error('refresh failed')
        await authService.completeSession() // cycle with partnerAuthService is safe: call time only
      } catch (e) {
        // Offline / server trouble: stay signed out for now but keep the stored token for the next load.
        if (!isTransient(e)) useAuthStore.getState().clear()
      } finally {
        useAuthStore.setState({ restoring: false })
      }
    })()
    return restoring
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
