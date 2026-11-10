import { PARTNER_ROUTES } from '../config/routes'

const AUTH_PAGES: string[] = [
  PARTNER_ROUTES.login,
  PARTNER_ROUTES.forgotPassword,
  PARTNER_ROUTES.resetPassword,
  PARTNER_ROUTES.activate,
]

/** Post-login destination: only in-app /partner pages, never auth pages (avoids redirect loops). */
export function partnerDestination(from?: { pathname?: string; search?: string }) {
  const path = from?.pathname ?? ''
  const ok = path.startsWith('/partner/') && !AUTH_PAGES.includes(path)
  return ok ? path + (from?.search ?? '') : PARTNER_ROUTES.dashboard
}
