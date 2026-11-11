import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ModuleKey } from '@/config/permissions'
import { ROUTES } from '@/config/routes'
import { useAuthStore } from '@/store/authStore'
import type { SessionKind } from '@/types/auth'
import { useAuth } from '../hooks/useAuth'

/**
 * Requires a session of `kind`. UI gating only; the backend authorizes every request.
 * - matching session -> render
 * - other portal's session -> that session's own home (no loop: home passes its own guard)
 * - none -> the single login, remembering the deep link (or the session-expired notice)
 */
export function ProtectedRoute({ kind = 'staff' }: { kind?: SessionKind }) {
  const expired = useAuthStore((s) => s.sessionExpired)
  const restoring = useAuthStore((s) => s.restoring)
  const { kind: actual, home } = useAuth()
  const location = useLocation()
  if (restoring) return null
  if (actual === kind) return <Outlet />
  if (actual) return <Navigate to={home} replace />
  return (
    <Navigate
      to={expired ? ROUTES.sessionExpired : ROUTES.login}
      state={{ from: location }}
      replace
    />
  )
}

/** "/" : send each visitor to where their session belongs (login when signed out). */
export function HomeRedirect() {
  const restoring = useAuthStore((s) => s.restoring)
  const { home } = useAuth()
  return restoring ? null : <Navigate to={home} replace />
}

/** Route-level permission check for a module. */
export function ModuleRoute({ module }: { module: ModuleKey }) {
  const { can } = useAuth()
  return can(module) ? <Outlet /> : <Navigate to={ROUTES.unauthorized} replace />
}

/** Inline permission guard for buttons/sections. */
export function PermissionGuard({
  module,
  children,
  fallback = null,
}: {
  module: ModuleKey
  children: ReactNode
  fallback?: ReactNode
}) {
  const { can } = useAuth()
  return <>{can(module) ? children : fallback}</>
}
