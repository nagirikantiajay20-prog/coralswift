import { create } from 'zustand'
import type { PartnerUser, SessionUser } from '@/types/auth'
import { claimTab, releaseTab } from './tabOwner'

/** MFA step the staff member must complete before the session is usable. */
export type MfaStep = 'verify' | 'enroll' | null

interface AuthState {
  user: SessionUser | null
  /** Partner session; mutually exclusive with `user` (one token set per tab). */
  partner: PartnerUser | null
  /**
   * The access token lives in memory only. The backend returns opaque bearer tokens in the body
   * (no HttpOnly cookie), so to survive a reload the one-time refresh token is mirrored to
   * sessionStorage (per tab, gone on tab close) and exchanged via POST /auth/refresh on startup.
   * Residual risk: any XSS can read it; mitigated by strict CSP and short server-side expiry.
   */
  accessToken: string | null
  refreshToken: string | null
  mfaStep: MfaStep
  /** GET endpoints the backend says this staff account may call (GET /auth/permissions); null = unknown. */
  permittedPaths: string[] | null
  /** role -> module names, when the backend publishes it (PermissionsOut.role_matrix). */
  roleMatrix: Record<string, string[]> | null
  sessionExpired: boolean
  /** True while a stored refresh token is being exchanged on startup; guards must wait. */
  restoring: boolean
  setTokens: (access: string, refresh: string, mfaStep?: MfaStep) => void
  setUser: (user: SessionUser) => void
  setPermissions: (paths: string[] | null, matrix?: Record<string, string[]> | null) => void
  setPartner: (partner: PartnerUser) => void
  expire: () => void
  clear: () => void
}

const KEY = 'cs.rt'
const store = (v: string | null) => {
  try {
    if (v) {
      sessionStorage.setItem(KEY, v)
      claimTab()
    } else {
      sessionStorage.removeItem(KEY)
      releaseTab()
    }
  } catch {
    /* storage blocked: session simply won't survive a reload */
  }
}
export const storedRefreshToken = (): string | null => {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

const empty = {
  user: null,
  partner: null,
  accessToken: null,
  refreshToken: null,
  mfaStep: null as MfaStep,
  permittedPaths: null as string[] | null,
  roleMatrix: null as Record<string, string[]> | null,
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...empty,
  sessionExpired: false,
  restoring: !!storedRefreshToken(),
  // Never persist while MFA is pending: a reload must not skip the second factor.
  setTokens: (accessToken, refreshToken, mfaStep = null) => {
    if (!mfaStep) store(refreshToken)
    set({ accessToken, refreshToken, mfaStep, sessionExpired: false })
  },
  setUser: (user) => {
    store(get().refreshToken)
    set({ user, partner: null, mfaStep: null, sessionExpired: false })
  },
  setPermissions: (permittedPaths, roleMatrix = null) => set({ permittedPaths, roleMatrix }),
  setPartner: (partner) => {
    store(get().refreshToken)
    set({ partner, user: null, mfaStep: null, sessionExpired: false })
  },
  expire: () => {
    store(null)
    set((s) => ({ ...empty, sessionExpired: !!(s.user || s.partner) }))
  },
  clear: () => {
    store(null)
    set({ ...empty, sessionExpired: false })
  },
}))
