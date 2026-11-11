import { endpoints } from '@/config/endpoints'
import type { ApiEnvelope } from '@/features/auth/types'
import { api } from '@/services/api/client'

/** Verified in openapi.json (2026-11-10). Shared /auth and /privacy endpoints; no new client. */
export interface SessionOut {
  id: string
  created_at: string
  last_used_at: string | null
  user_agent: string | null
  current: boolean
  expires_at?: string | null
}
export type PrivacyKind = 'access' | 'correction' | 'deletion'
/** Backend PartnerPrivacyRequestOut. */
export interface PartnerPrivacyRequest {
  reference: string
  kind: PrivacyKind
  status: 'received' | 'in_progress' | 'completed' | 'rejected'
  details: string | null
  resolution_note: string | null
  created_at: string
}

const A = '/api/v1/auth'
const d = <T>(r: { data: ApiEnvelope<T> }) => r.data.data

export const partnerSettingsService = {
  async sessions() {
    return d(await api.get<ApiEnvelope<SessionOut[]>>(`${A}/sessions`))
  },
  async revokeSession(id: string) {
    await api.delete(`${A}/sessions/${id}`)
  },
  /** DELETE /auth/sessions: signs out every other session. */
  async revokeOtherSessions() {
    await api.delete(`${A}/sessions`)
  },
  /** GET /auth/me; mfa_enabled is reported since the 2026-11 contract. */
  async me() {
    return d(await api.get<ApiEnvelope<{ mfa_enabled?: boolean }>>(`${A}/me`))
  },
  /** POST /auth/mfa/disable (partner accounts only): current password and authenticator code. */
  async disableMfa(body: { password: string; code: string }) {
    await api.post(`${A}/mfa/disable`, body)
  },
  /** Needs a current authenticator code; old codes stop working. Codes are shown once. */
  async regenerateRecoveryCodes(code: string) {
    return d(
      await api.post<ApiEnvelope<{ recovery_codes: string[] }>>(`${A}/mfa/recovery-codes`, {
        code,
      }),
    )
  },
  /** Reset-by-email is the only password workflow (no change-password endpoint). Same answer always. */
  async sendPasswordReset(email: string) {
    await api.post(endpoints.auth.forgotPassword, { email })
  },
  /** POST /partner/privacy-requests: identity comes from the session, no email is sent. */
  async submitPrivacyRequest(body: { kind: PrivacyKind; details?: string }) {
    return d(
      await api.post<ApiEnvelope<PartnerPrivacyRequest>>('/api/v1/partner/privacy-requests', body),
    )
  },
  /** GET /partner/privacy-requests: the caller's own requests. */
  async privacyRequests() {
    return (
      d(await api.get<ApiEnvelope<PartnerPrivacyRequest[]>>('/api/v1/partner/privacy-requests')) ??
      []
    )
  },
}
