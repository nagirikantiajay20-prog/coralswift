import { create } from 'zustand'
import type { PartnerUser, SessionUser } from '@/types/auth'

/** MFA step the staff member must complete before the session is usable. */
export type MfaStep = 'verify' | 'enroll' | null

interface AuthState {
  user: SessionUser | null
  /** Partner session; mutually exclusive with `user` (one token set per tab). */
  partner: PartnerUser | null
  /**
   * Tokens live in memory only (never web storage): the backend returns opaque tokens in the
   * response body (no HttpOnly cookie), so a reload signs the user out by design.
   */
  accessToken: string | null
  refreshToken: string | null
  mfaStep: MfaStep
  sessionExpired: boolean
  setTokens: (access: string, refresh: string, mfaStep?: MfaStep) => void
  setUser: (user: SessionUser) => void
  setPartner: (partner: PartnerUser) => void
  expire: () => void
  clear: () => void
}

const empty = {
  user: null,
  partner: null,
  accessToken: null,
  refreshToken: null,
  mfaStep: null as MfaStep,
}

export const useAuthStore = create<AuthState>((set) => ({
  ...empty,
  sessionExpired: false,
  setTokens: (accessToken, refreshToken, mfaStep = null) =>
    set({ accessToken, refreshToken, mfaStep, sessionExpired: false }),
  setUser: (user) => set({ user, partner: null, mfaStep: null, sessionExpired: false }),
  setPartner: (partner) => set({ partner, user: null, mfaStep: null, sessionExpired: false }),
  expire: () => set((s) => ({ ...empty, sessionExpired: !!(s.user || s.partner) })),
  clear: () => set({ ...empty, sessionExpired: false }),
}))
