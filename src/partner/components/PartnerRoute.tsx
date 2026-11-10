import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { PARTNER_ROUTES } from '../config/routes'

/**
 * UX guard only (the backend authorizes every request). Partner session -> render; a staff session
 * is denied (never promoted to partner); no session -> partner login, remembering the destination.
 */
export function PartnerRoute() {
  const partner = useAuthStore((s) => s.partner)
  const staff = useAuthStore((s) => s.user)
  const location = useLocation()
  if (partner) return <Outlet />
  if (staff) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-muted">
          You are signed in with a staff account. The Partner Portal is for partner accounts only.
        </p>
        <Link
          to={PARTNER_ROUTES.login}
          className="mt-4 inline-block text-sm text-coral-ink hover:underline"
        >
          Partner sign in
        </Link>
      </div>
    )
  }
  return <Navigate to={PARTNER_ROUTES.login} state={{ from: location }} replace />
}
