import { ROUTES } from '@/config/routes'
import { PARTNER_ROUTES } from '@/partner/config/routes'
import type { SessionKind } from '@/types/auth'

const HOME: Record<SessionKind, string> = {
  staff: ROUTES.dashboard,
  partner: PARTNER_ROUTES.dashboard,
}
const AREA: Record<SessionKind, string> = { staff: '/admin/', partner: '/partner/' }
/** Never a post-login target: bouncing back to these would loop or strand the user. */
const AUTH_PAGES: string[] = [
  ROUTES.login,
  '/partner/login', // legacy redirect to ROUTES.login
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.unauthorized,
  ROUTES.sessionExpired,
  PARTNER_ROUTES.forgotPassword,
  PARTNER_ROUTES.resetPassword,
  PARTNER_ROUTES.activate,
]

export const homeFor = (kind: SessionKind) => HOME[kind]

/**
 * Post-login destination: the remembered deep link only if it is an in-app page of the portal this
 * session belongs to (so a partner never lands on /admin and vice versa); otherwise that
 * portal's dashboard. Strings like `//evil.test` or `https://…` never pass the prefix check.
 */
export function resolveDestination(
  kind: SessionKind,
  from?: { pathname?: string; search?: string } | null,
) {
  const path = from?.pathname ?? ''
  const ok = path.startsWith(AREA[kind]) && !AUTH_PAGES.includes(path)
  return ok ? path + (from?.search ?? '') : HOME[kind]
}
