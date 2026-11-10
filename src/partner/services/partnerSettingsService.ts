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
}
export type PrivacyKind = 'access' | 'correction' | 'deletion'

const A = '/api/v1/auth'
const d = <T>(r: { data: ApiEnvelope<T> }) => r.data.data

export const partnerSettingsService = {
  async sessions() {
    return d(await api.get<ApiEnvelope<SessionOut[]>>(`${A}/sessions`))
  },
  async revokeSession(id: string) {
    await api.delete(`${A}/sessions/${id}`)
  },
  /** Needs a current authenticator code; old codes stop working. Codes are shown once. */
  async regenerateRecoveryCodes(code: string) {
    return d(
      await api.post<ApiEnvelope<{ recovery_codes: string[] }>>(`${A}/mfa/recovery-codes`, { code }),
    )
  },
  /** Reset-by-email is the only password workflow (no change-password endpoint). Same answer always. */
  async sendPasswordReset(email: string) {
    await api.post(endpoints.auth.forgotPassword, { email })
  },
  /** POST /privacy/requests (public; no list/status endpoint exists). Returns an untyped dict. */
  async submitPrivacyRequest(body: { email: string; kind: PrivacyKind; details?: string }) {
    return d(await api.post<ApiEnvelope<Record<string, string>>>('/api/v1/privacy/requests', body))
  },
}
