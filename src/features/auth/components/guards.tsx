import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ModuleKey } from '@/config/permissions'
import { ROUTES } from '@/config/routes'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '../hooks/useAuth'

/** Requires an authenticated session. UI gating only; the backend authorizes every request. */
export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const expired = useAuthStore((s) => s.sessionExpired)
  const restoring = useAuthStore((s) => s.restoring)
  const location = useLocation()
  if (restoring) return null
  if (user) return <Outlet />
  return (
    <Navigate
      to={expired ? ROUTES.sessionExpired : ROUTES.login}
      state={{ from: location }}
      replace
    />
  )
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
